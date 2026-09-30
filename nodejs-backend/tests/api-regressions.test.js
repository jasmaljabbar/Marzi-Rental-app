const { describe, it, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");
const Reservation = require("../src/models/Reservation");

describe("API audit regressions", () => {
  let app;
  let owner;
  before(async () => { await h.startDb(); app = h.buildApp({ STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "" }); });
  after(h.stopDb);
  beforeEach(async () => { await h.resetDb(); await h.seedPlans(); owner = await h.registerBusiness(app); });

  it("returns 501 instead of 500 when checkout or portal billing is not configured", async () => {
    for (const url of ["/subscription/portal", "/subscription/checkout"]) {
      const response = await owner.post(url).send(url.endsWith("checkout") ? { plan_key: "pro" } : {});
      assert.equal(response.status, 501);
      assert.equal(response.body.code, "NOT_CONFIGURED");
    }
  });

  it("prevents pinned staff from reading another shop's summary", async () => {
    const branch = await owner.post("/shops").send({ name: "Restricted Branch" });
    assert.equal(branch.status, 201);
    await owner.post("/auth/users").send({ username: "pinned", password: "Pinned-test-42", shop_id: owner.info.shop_id });
    const staff = await h.login(app, "pinned", "Pinned-test-42", owner.info.business_code);
    assert.equal((await staff.get(`/shops/${owner.info.shop_id}/summary`)).status, 200);
    assert.equal((await staff.get(`/shops/${branch.body.id}/summary`)).status, 404);
    assert.equal((await owner.get(`/shops/${branch.body.id}/summary`)).status, 200);
  });

  it("does not orphan categories or recurring templates when deleting a shop", async () => {
    const branch = await owner.post("/shops").send({ name: "Branch" });
    const cat = await owner.post("/categories", branch.body.id).send({ name: "Empty Category" });
    assert.equal(cat.status, 201);
    assert.equal((await owner.delete(`/shops/${branch.body.id}`)).body.code, "SHOP_NOT_EMPTY");
    await owner.delete(`/categories/${cat.body.id}`, branch.body.id);
    const recurring = await owner.post("/expenses/recurring", branch.body.id).send({ category: "Rent", amount: 100, day_of_month: 1 });
    assert.equal(recurring.status, 201);
    assert.equal((await owner.delete(`/shops/${branch.body.id}`)).body.code, "SHOP_NOT_EMPTY");
  });

  it("ignores expired reservations before MongoDB TTL cleanup and refuses to transfer them", async () => {
    const equipment = await h.createEquipment(owner, { stock: 1 });
    const first = await h.createCustomer(owner);
    const second = await h.createCustomer(owner);
    const hold = await owner.post("/reservations").send({ customer_id: first.id, equipment_id: equipment.id, quantity: 1 });
    await Reservation.updateOne({ _id: hold.body.id, accountId: owner.info.account_id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    assert.deepEqual((await owner.get("/reservations")).body, []);
    const next = await owner.post("/reservations").send({ customer_id: second.id, equipment_id: equipment.id, quantity: 1 });
    assert.equal(next.status, 201);
    assert.equal((await owner.post(`/reservations/${hold.body.id}/transfer`).send({ to_customer_id: second.id })).status, 404);
  });

  it("rejects new reservations for archived customers or equipment", async () => {
    const equipment = await h.createEquipment(owner);
    const customer = await h.createCustomer(owner);
    await owner.post(`/customers/${customer.id}/archive`);
    const payload = { customer_id: customer.id, equipment_id: equipment.id, quantity: 1 };
    assert.equal((await owner.post("/reservations").send(payload)).body.code, "CUSTOMER_ARCHIVED");
    await owner.post(`/customers/${customer.id}/restore`);
    await owner.post(`/equipment/${equipment.id}/archive`);
    assert.equal((await owner.post("/reservations").send(payload)).body.code, "EQUIPMENT_ARCHIVED");
  });
});
