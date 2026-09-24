const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");
const { outbox } = require("../src/lib/mailer");

describe("authentication, identity and password reset (P0-2, P1-1, P1-2)", () => {
  let app;
  before(async () => {
    await h.startDb();
    app = h.buildApp();
  });
  after(h.stopDb);
  beforeEach(async () => {
    await h.resetDb();
    await h.seedPlans();
    outbox.length = 0;
  });

  it("registers a business atomically with a business code", async () => {
    const owner = await h.registerBusiness(app, { username: "Alice", company: "Acme Rentals" });
    assert.equal(owner.info.username, "alice");
    assert.equal(owner.info.role, "owner");
    assert.equal(owner.info.business_code, "acme-rentals");
    const me = await owner.get("/auth/me");
    assert.equal(me.body.business_code, "acme-rentals");
  });

  it("leaves nothing behind when registration fails", async () => {
    const Plan = require("../src/models/Plan");
    const User = require("../src/models/User");
    await Plan.deleteMany({});
    const res = await h.request(app).post("/auth/register").send({ username: "bob", password: "long-enough-1", company_name: "Bob Co" });
    assert.equal(res.status, 400);
    assert.equal(await User.countDocuments(), 0);
  });

  it("lets two businesses use the same username and asks for the business code", async () => {
    const a = await h.registerBusiness(app, { username: "admin", company: "Alpha" });
    await h.registerBusiness(app, { username: "admin", company: "Beta" });

    const ambiguous = await h.request(app).post("/auth/login").send({ username: "admin", password: a.info.password });
    assert.equal(ambiguous.status, 409);
    assert.equal(ambiguous.body.code, "BUSINESS_CODE_REQUIRED");

    const ok = await h.request(app).post("/auth/login").send({ username: "admin", password: a.info.password, business_code: "alpha" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.business_code, "alpha");
  });

  it("logs in without a code when the username is unique", async () => {
    await h.registerBusiness(app, { username: "solo", password: "solo-password-1" });
    const res = await h.request(app).post("/auth/login").send({ username: "SOLO", password: "solo-password-1" });
    assert.equal(res.status, 200);
  });

  it("answers wrong passwords and unknown users identically", async () => {
    await h.registerBusiness(app, { username: "carol", password: "carol-password-1" });
    const wrong = await h.request(app).post("/auth/login").send({ username: "carol", password: "nope-nope-1" });
    const unknown = await h.request(app).post("/auth/login").send({ username: "nobody", password: "nope-nope-1" });
    assert.equal(wrong.status, 401);
    assert.deepEqual(wrong.body, unknown.body);
  });

  it("enforces the password policy on the server", async () => {
    for (const password of ["short", "password123", "aaaaaaaaaa"]) {
      const res = await h.request(app).post("/auth/register").send({ username: "dave", password, company_name: "Dave Co" });
      assert.equal(res.status, 400, password);
      assert.equal(res.body.code, "WEAK_PASSWORD");
    }
  });

  it("never returns a reset code and answers the same for unknown users", async () => {
    await h.registerBusiness(app, { username: "erin" });
    const known = await h.request(app).post("/auth/forgot-password").send({ username: "erin" });
    const unknown = await h.request(app).post("/auth/forgot-password").send({ username: "ghost" });
    const legacy = await h.request(app).post("/auth/request-reset/erin");
    for (const res of [known, unknown, legacy]) {
      assert.equal(res.status, 200);
      assert.equal(res.body.reset_code_for_demo, undefined);
      assert.equal(res.body.code, undefined);
    }
    assert.deepEqual(known.body, unknown.body);
    const oldFlow = await h.request(app).post("/auth/reset-password").send({ username: "erin", reset_code: "123456", new_password: "whatever-1" });
    assert.equal(oldFlow.status, 400);
    assert.equal(oldFlow.body.code, "RESET_METHOD_REMOVED");
  });

  it("resets a password through a single-use emailed token and signs out old sessions", async () => {
    const owner = await h.registerBusiness(app, { username: "frank", email: "frank@example.com" });
    await h.request(app).post("/auth/forgot-password").send({ username: "frank" });
    assert.equal(outbox.length, 1);
    assert.equal(outbox[0].to, "frank@example.com");
    const token = outbox[0].text.match(/token=([\w-]+)/)[1];

    const reset = await h.request(app).post("/auth/reset-password").send({ token, new_password: "brand-new-pass-1" });
    assert.equal(reset.status, 200);
    const reuse = await h.request(app).post("/auth/reset-password").send({ token, new_password: "another-pass-1" });
    assert.equal(reuse.status, 400);
    assert.equal(reuse.body.code, "INVALID_RESET_TOKEN");

    assert.equal((await owner.get("/auth/me")).status, 401, "old token revoked");
    await h.login(app, "frank", "brand-new-pass-1");
  });

  it("rejects expired reset tokens", async () => {
    await h.registerBusiness(app, { username: "gina", email: "gina@example.com" });
    await h.request(app).post("/auth/forgot-password").send({ username: "gina" });
    const token = outbox[0].text.match(/token=([\w-]+)/)[1];
    const User = require("../src/models/User");
    await User.updateOne({ username: "gina" }, { $set: { resetTokenExpiresAt: new Date(Date.now() - 1000) } });
    const res = await h.request(app).post("/auth/reset-password").send({ token, new_password: "brand-new-pass-1" });
    assert.equal(res.status, 400);
  });

  it("changing your own password revokes other sessions and returns a new token", async () => {
    const owner = await h.registerBusiness(app, { username: "hank", password: "hank-password-1" });
    const res = await owner.put("/auth/me/password").send({ current_password: "hank-password-1", new_password: "hank-password-2" });
    assert.equal(res.status, 200);
    assert.equal((await owner.get("/auth/me")).status, 401);
    assert.equal((await h.client(app, res.body.access_token).get("/auth/me")).status, 200);
  });

  it("does not count the owner against the team limit", async () => {
    const owner = await h.registerBusiness(app);
    assert.equal((await owner.post("/auth/users").send({ username: "s1", password: "staff-pass-1" })).status, 201);
    assert.equal((await owner.post("/auth/users").send({ username: "s2", password: "staff-pass-2", role: "admin" })).status, 201);
    const third = await owner.post("/auth/users").send({ username: "s3", password: "staff-pass-3" });
    assert.equal(third.status, 403);
    assert.equal(third.body.code, "PLAN_LIMIT_REACHED");
  });

  it("creates team members without handing out their token", async () => {
    const owner = await h.registerBusiness(app);
    const res = await owner.post("/auth/users").send({ username: "ivy", password: "ivy-password-1" });
    assert.equal(res.status, 201);
    assert.equal(res.body.access_token, undefined);
    assert.equal(res.body.role, "staff");
    const dup = await owner.post("/auth/users").send({ username: "IVY", password: "ivy-password-2" });
    assert.equal(dup.status, 409);
  });

  it("lets an admin reset a staff password, which signs the staff member out", async () => {
    const owner = await h.registerBusiness(app);
    const created = await owner.post("/auth/users").send({ username: "jay", password: "jay-password-1" });
    const staff = await h.login(app, "jay", "jay-password-1");
    const res = await owner.put(`/auth/users/${created.body.id}/password`).send({ new_password: "jay-password-2" });
    assert.equal(res.status, 200);
    assert.equal((await staff.get("/auth/me")).status, 401);
    await h.login(app, "jay", "jay-password-2");
  });

  it("protects the owner and blocks staff from team management", async () => {
    const owner = await h.registerBusiness(app);
    await owner.post("/auth/users").send({ username: "kim", password: "kim-password-1", role: "admin" });
    await owner.post("/auth/users").send({ username: "lee", password: "lee-password-1" });
    const admin = await h.login(app, "kim", "kim-password-1");
    const staff = await h.login(app, "lee", "lee-password-1");
    const users = await admin.get("/auth/users");
    const ownerRow = users.body.find((u) => u.role === "owner");
    assert.equal((await admin.delete(`/auth/users/${ownerRow.id}`)).status, 403);
    assert.equal((await admin.put(`/auth/users/${ownerRow.id}/role`).send({ role: "staff" })).status, 403);
    assert.equal((await staff.get("/auth/users")).status, 403);
    assert.equal((await staff.post("/auth/users").send({ username: "x", password: "x-password-1" })).status, 403);
  });

  it("accepts tokens issued by the previous API version until they expire", async () => {
    const jwt = require("jsonwebtoken");
    const owner = await h.registerBusiness(app);
    const User = require("../src/models/User");
    const user = await User.findOne({ username: owner.info.username });
    const legacy = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: "1h" });
    assert.equal((await h.client(app, legacy).get("/auth/me")).status, 200);
  });

  it("rejects tokens signed with another algorithm or secret", async () => {
    const jwt = require("jsonwebtoken");
    const owner = await h.registerBusiness(app);
    const forged = jwt.sign({ sub: "x" }, "wrong-secret");
    assert.equal((await h.client(app, forged).get("/auth/me")).status, 401);
    const none = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: owner.info.account_id })).toString("base64url")}.`;
    assert.equal((await h.client(app, none).get("/auth/me")).status, 401);
  });

  it("sends pure platform admins to the admin login", async () => {
    const User = require("../src/models/User");
    const bcrypt = require("bcryptjs");
    await User.create({ username: "ops", hashedPassword: await bcrypt.hash("ops-password-1", 4), isPlatformAdmin: true, role: "admin" });
    const res = await h.request(app).post("/auth/login").send({ username: "ops", password: "ops-password-1" });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, "PLATFORM_ADMIN_USE_ADMIN_LOGIN");
  });

  it("rate-limits login attempts", async () => {
    const limited = h.buildApp({ AUTH_RATE_LIMIT_MAX: "3" });
    const statuses = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await h.request(limited).post("/auth/login").send({ username: "x", password: "y-password-1" })).status);
    }
    assert.deepEqual(statuses.slice(-2), [429, 429]);
    h.buildApp({ AUTH_RATE_LIMIT_MAX: "100000" });
  });
});
