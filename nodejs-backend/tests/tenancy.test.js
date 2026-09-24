const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const h = require("./helpers");

describe("tenant isolation (P0-1, P0-3, P0-4)", () => {
  let app;
  before(async () => {
    await h.startDb();
    app = h.buildApp();
  });
  after(h.stopDb);
  beforeEach(async () => {
    await h.resetDb();
    await h.seedPlans();
  });

  it("rejects anonymous access to every business route", async () => {
    const routes = [
      ["get", "/customers"],
      ["get", "/customers/9990001111"],
      ["get", "/equipment"],
      ["get", `/equipment/${new mongoose.Types.ObjectId()}`],
      ["get", "/categories"],
      ["get", "/settings"],
      ["get", "/settings/qr_code"],
      ["get", "/stats"],
      ["get", "/rentals"],
      ["get", "/invoices"],
      ["get", "/expenses"],
      ["get", "/reports/dashboard"],
      ["post", "/upload"],
      ["get", "/platform/accounts"],
      ["get", "/auth/users"],
    ];
    for (const [method, url] of routes) {
      const res = await h.request(app)[method](url);
      assert.equal(res.status, 401, `${method.toUpperCase()} ${url} should require login, got ${res.status}`);
    }
    for (const url of ["/health", "/plans", "/catalog"]) {
      assert.equal((await h.request(app).get(url)).status, 200, `${url} stays public`);
    }
  });

  it("never shows one business's records to another", async () => {
    const a = await h.registerBusiness(app, { company: "Shop A" });
    const b = await h.registerBusiness(app, { company: "Shop B" });
    const customerA = await h.createCustomer(a, { name: "A-Secret", phone: "9990001111" });
    const equipmentA = await h.createEquipment(a, { name: "A-Drill" });
    await h.createCustomer(b, { name: "B-Secret", phone: "8880002222" });

    const listB = await b.get("/customers");
    assert.deepEqual(listB.body.map((c) => c.name), ["B-Secret"]);
    assert.equal((await b.get("/customers/9990001111")).status, 404);
    assert.equal((await b.get(`/equipment/${equipmentA.id}`)).status, 404);
    assert.equal((await b.put(`/customers/${customerA.id}`).send({ name: "hijack" })).status, 404);
    assert.equal((await b.delete(`/equipment/${equipmentA.id}`)).status, 404);
    const stats = await b.get("/stats");
    assert.equal(stats.body.customerCount, 1);
  });

  it("lets the same phone number and category name exist in different businesses", async () => {
    const a = await h.registerBusiness(app);
    const b = await h.registerBusiness(app);
    await h.createCustomer(a, { phone: "+91 98765 43210" });
    await h.createCustomer(b, { phone: "9876543210" });
    assert.equal((await a.post("/categories").send({ name: "General" })).status, 201);
    assert.equal((await b.post("/categories").send({ name: "General" })).status, 201);
  });

  it("treats formatted variants of a phone number as duplicates within one shop", async () => {
    const a = await h.registerBusiness(app);
    await h.createCustomer(a, { phone: "+91 98765-43210" });
    const dup = await a.post("/customers").send({ name: "Dup", phone: "+919876543210" });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.code, "DUPLICATE_PHONE");
  });

  it("refuses to pin staff to a shop outside the business", async () => {
    const a = await h.registerBusiness(app);
    const b = await h.registerBusiness(app);
    const res = await a.post("/auth/users").send({ username: "counter1", password: "counter-pass-1", shop_id: String(b.info.shop_id) });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "INVALID_SHOP");
  });

  it("rejects an X-Shop-Id that belongs to another business", async () => {
    const a = await h.registerBusiness(app);
    const b = await h.registerBusiness(app);
    const res = await a.get("/customers", b.info.shop_id);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, "SHOP_NOT_ACCESSIBLE");
  });

  it("fails closed instead of unscoping when the active shop disappears", async () => {
    const a = await h.registerBusiness(app);
    const b = await h.registerBusiness(app);
    await h.createCustomer(b, { name: "B-Secret" });

    const blocked = await a.put(`/shops/${a.info.shop_id}`).send({ is_active: false });
    assert.equal(blocked.status, 400);
    assert.equal(blocked.body.code, "LAST_ACTIVE_SHOP");

    // Even if the data is changed behind the API's back, requests are refused.
    const Shop = require("../src/models/Shop");
    await Shop.updateMany({ accountId: a.info.account_id }, { $set: { isActive: false } });
    const res = await a.get("/customers");
    assert.equal(res.status, 403);
    assert.equal(res.body.code, "NO_ACTIVE_SHOP");
  });

  it("keeps pinned staff inside their own shop", async () => {
    const owner = await h.registerBusiness(app);
    const second = await owner.post("/shops").send({ name: "Branch 2" });
    assert.equal(second.status, 201);
    await h.createCustomer(owner, { name: "Main-only" });
    const staff = await owner.post("/auth/users").send({ username: "branch-staff", password: "branch-pass-1", shop_id: second.body.id });
    assert.equal(staff.status, 201);

    const session = await h.login(app, "branch-staff", "branch-pass-1");
    assert.deepEqual((await session.get("/customers")).body, []);
    assert.equal((await session.get("/customers", owner.info.shop_id)).status, 403);
    const shops = await session.get("/shops");
    assert.deepEqual(shops.body.map((s) => s.id), [second.body.id]);
  });

  it("keeps platform admins without a business out of tenant routes", async () => {
    const User = require("../src/models/User");
    const bcrypt = require("bcryptjs");
    await User.create({ username: "root", hashedPassword: await bcrypt.hash("root-password-1", 4), role: "admin", isPlatformAdmin: true });
    const login = await h.request(app).post("/auth/admin/login").send({ username: "root", password: "root-password-1" });
    assert.equal(login.status, 200);
    const admin = h.client(app, login.body.access_token);
    const res = await admin.get("/customers");
    assert.equal(res.status, 403);
    assert.equal(res.body.code, "NO_ACCOUNT");
    assert.equal((await admin.get("/platform/accounts")).status, 200);
  });

  it("throws when a tenant query is missing its account filter", async () => {
    const Customer = require("../src/models/Customer");
    await assert.rejects(() => Customer.find({}), /Tenant filter \(accountId\) missing/);
    await assert.rejects(() => Customer.aggregate([{ $match: {} }]), /Tenant filter/);
    await Customer.find({}).setOptions({ skipTenantCheck: true });
  });

  it("does not let one business reference another's category", async () => {
    const a = await h.registerBusiness(app);
    const b = await h.registerBusiness(app);
    const catB = await b.post("/categories").send({ name: "B cat" });
    const res = await a.post("/equipment").send({ name: "X", rent_per_day: 1, category_id: catB.body.id });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "INVALID_CATEGORY");
  });
});
