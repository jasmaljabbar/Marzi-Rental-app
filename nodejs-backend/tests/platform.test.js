const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const h = require("./helpers");

describe("platform console", () => {
  let app;
  let admin;
  before(async () => {
    await h.startDb();
    app = h.buildApp();
  });
  after(h.stopDb);
  beforeEach(async () => {
    await h.resetDb();
    await h.seedPlans();
    const User = require("../src/models/User");
    await User.create({ username: "root", hashedPassword: await bcrypt.hash("root-password-1", 4), role: "admin", isPlatformAdmin: true });
    const res = await h.request(app).post("/auth/admin/login").send({ username: "root", password: "root-password-1" });
    admin = h.client(app, res.body.access_token);
  });

  it("is closed to tenant owners", async () => {
    const owner = await h.registerBusiness(app);
    assert.equal((await owner.get("/platform/accounts")).status, 403);
  });

  it("lists businesses and changes their plan", async () => {
    const owner = await h.registerBusiness(app, { company: "Listed Co" });
    const list = await admin.get("/platform/accounts");
    assert.equal(list.body[0].company_name, "Listed Co");
    assert.equal(list.body[0].business_code, "listed-co");
    const plans = await admin.get("/platform/plans");
    const pro = plans.body.find((p) => p.key === "pro");
    const res = await admin.put(`/platform/accounts/${owner.info.account_id}/plan`).send({ plan_id: pro.id });
    assert.equal(res.status, 200);
    assert.equal(res.body.subscription.status, "active");
  });

  it("deletes a business and every record it owns, and nothing else", async () => {
    const doomed = await h.registerBusiness(app);
    const survivor = await h.registerBusiness(app);
    for (const owner of [doomed, survivor]) {
      const customer = await h.createCustomer(owner);
      const eq = await h.createEquipment(owner, { purchase: 10 });
      const r = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id, advance_amount: 5 })).body;
      await owner.post(`/rentals/${r.id}/complete`).send({});
      await owner.post("/equipment/maintenance").send({ equipment_id: eq.id, action: "Damage" });
      await owner.put("/settings/low_stock_threshold").send({ value: "3" });
      await owner.post("/upload?kind=equipment").attach("file", await h.pngBuffer(), { filename: "a.png", contentType: "image/png" });
    }
    const res = await admin.delete(`/platform/accounts/${doomed.info.account_id}`);
    assert.equal(res.status, 200);

    const { TENANT_MODELS } = require("../src/services/platformService");
    for (const name of TENANT_MODELS) {
      const left = await mongoose.model(name).countDocuments({ accountId: doomed.info.account_id }).setOptions({ skipTenantCheck: true });
      assert.equal(left, 0, `${name} still has records of the deleted business`);
    }
    assert.equal((await survivor.get("/customers")).body.length, 1);
    assert.equal((await doomed.get("/auth/me")).status, 401);
  });
});
