const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");

describe("reports and dashboard (P2-2)", () => {
  let app;
  let owner;
  before(async () => {
    await h.startDb();
    app = h.buildApp();
  });
  after(h.stopDb);
  beforeEach(async () => {
    await h.resetDb();
    await h.seedPlans();
    owner = await h.registerBusiness(app);
  });

  it("builds the dashboard server-side", async () => {
    const customer = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner, { rentPerDay: 100, stock: 4 });
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const overdue = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id, quantity: 2, advance_amount: 50 })).body;
    await h.backdateRental(overdue.id, 2);
    await owner.put(`/rentals/${overdue.id}`).send({ expected_return_date: yesterday });
    const done = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id })).body;
    await owner.post(`/rentals/${done.id}/complete`).send({ amount_paid_on_return: 30 });

    const res = await owner.get("/reports/dashboard?tz=330");
    assert.equal(res.status, 200);
    assert.equal(res.body.active_rentals, 1);
    assert.equal(res.body.overdue_count, 1);
    assert.equal(res.body.alerts[0].rental.customer.name, customer.name);
    assert.equal(res.body.inventory.rented_out_units, 2);
    assert.equal(res.body.inventory.fleet_size, 4);
    assert.equal(res.body.inventory.utilization_percent, 50);
    assert.equal(res.body.revenue.this_month, 80, "advance 50 + payment 30");
    assert.equal(res.body.outstanding_due.amount, 70);
    assert.equal(res.body.customers_count, 1);
  });

  it("summarises cash, expenses and top lists for a date range", async () => {
    const customer = await h.createCustomer(owner, { name: "Top Customer" });
    const eq = await h.createEquipment(owner, { rentPerDay: 100, name: "Mixer" });
    const r = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id, advance_amount: 40 })).body;
    await owner.post(`/rentals/${r.id}/complete`).send({ amount_paid_on_return: 60 });
    await owner.post("/expenses").send({ category: "Rent", amount: 25 });

    const start = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await owner.get(`/reports/summary?start_date=${start}&end_date=${end}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.money_received, 100);
    assert.equal(res.body.expenses, 25);
    assert.equal(res.body.net_cash, 75);
    assert.equal(res.body.top_customers[0].customer_name, "Top Customer");
    assert.equal(res.body.top_equipment[0].equipment_name, "Mixer");
    assert.equal(res.body.trend.reduce((s, t) => s + t.income, 0), 100);

    const entries = await owner.get(`/reports/payments?start_date=${start}&end_date=${end}`);
    assert.deepEqual(entries.body.map((e) => [e.kind, e.amount, e.customer_name]).sort(), [["advance", 40, "Top Customer"], ["return", 60, "Top Customer"]]);

    const profit = await owner.get(`/reports/net-profit?start_date=${start}&end_date=${end}`);
    assert.equal(profit.status, 200);
    assert.equal(profit.body.rental_revenue, 100);
    assert.equal(profit.body.operating_expenses, 25);
  });

  it("counts older rentals without a payment ledger once", async () => {
    const customer = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner);
    const r = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id })).body;
    await owner.post(`/rentals/${r.id}/complete`).send({ amount_paid_on_return: 100 });
    // Simulate a pre-ledger rental: remove its ledger rows and mark it legacy.
    const Payment = require("../src/models/Payment");
    const Rental = require("../src/models/Rental");
    await Payment.deleteMany({ rentalId: r.id }).setOptions({ skipTenantCheck: true });
    await Rental.updateOne({ _id: r.id }, { $set: { ledger: false, advanceAmount: 20 } }).setOptions({ skipTenantCheck: true });
    const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await owner.get(`/reports/summary?start_date=${start}&end_date=${end}`);
    assert.equal(res.body.money_received, 120);
  });

  it("keeps reports to owners and admins", async () => {
    await owner.post("/auth/users").send({ username: "counter", password: "counter-pass-1" });
    const staff = await h.login(app, "counter", "counter-pass-1");
    const start = new Date().toISOString();
    assert.equal((await staff.get(`/reports/summary?start_date=${start}&end_date=${start}`)).status, 403);
    assert.equal((await staff.get("/reports/dashboard")).status, 200);
  });
});
