const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");

const sum = (rows, key) => Math.round(rows.reduce((s, r) => s + r[key], 0) * 100) / 100;

async function payments(owner, rentalId) {
  return (await owner.get(`/rentals/${rentalId}/payments`)).body;
}

describe("rentals, stock and money (P0-5, P1-4, P2-3)", () => {
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

  it("splits one order advance across lines instead of copying it (P0-5)", async () => {
    const customer = await h.createCustomer(owner);
    const items = [];
    for (let i = 0; i < 3; i++) items.push(await h.createEquipment(owner, { rentPerDay: 100 }));
    const res = await owner.post("/rentals/bulk").send({ customer_id: customer.id, items: items.map((e) => ({ equipment_id: e.id })), advance_amount: 250 });
    assert.equal(res.status, 201);
    assert.equal(sum(res.body, "advance_amount"), 250);
    assert.equal(new Set(res.body.map((r) => r.order_id)).size, 1, "lines share one order id");
    assert.ok(res.body[0].customer.name, "response embeds customer name");

    const ret = await owner.post("/rentals/return").send({ rental_ids: res.body.map((r) => r.id) });
    assert.equal(ret.status, 200);
    assert.equal(ret.body.summary.totals.total_amount, 300);
    assert.equal(ret.body.summary.totals.amount_due, 50, "customer still owes 300 - 250");
    assert.equal(sum(ret.body.rentals, "amount_due"), 50);
  });

  it("rejects an advance above the estimated total", async () => {
    const customer = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner, { rentPerDay: 100 });
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id, expected_return_date: tomorrow, advance_amount: 500 });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "ADVANCE_TOO_HIGH");
  });

  it("never oversells under concurrent requests (P1-4)", async () => {
    const customer = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner, { stock: 1 });
    const attempts = await Promise.all(
      Array.from({ length: 5 }, () => owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id }))
    );
    const created = attempts.filter((r) => r.status === 201);
    assert.equal(created.length, 1);
    assert.ok(attempts.filter((r) => r.status !== 201).every((r) => r.body.code === "INSUFFICIENT_STOCK" || r.status === 409 || r.status === 400));
    const after = await owner.get(`/equipment/${eq.id}`);
    assert.equal(after.body.stock_count, 0);
  });

  it("rolls back the whole order when one line is out of stock", async () => {
    const customer = await h.createCustomer(owner);
    const plenty = await h.createEquipment(owner, { stock: 5 });
    const scarce = await h.createEquipment(owner, { stock: 1 });
    const res = await owner.post("/rentals/bulk").send({
      customer_id: customer.id,
      items: [{ equipment_id: plenty.id, quantity: 2 }, { equipment_id: scarce.id, quantity: 3 }],
    });
    assert.equal(res.status, 400);
    assert.equal((await owner.get(`/equipment/${plenty.id}`)).body.stock_count, 5, "first line's stock was restored");
    assert.deepEqual((await owner.get("/rentals")).body, []);
  });

  it("does not rent out damaged units", async () => {
    const customer = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner, { stock: 2 });
    await owner.post("/equipment/maintenance").send({ equipment_id: eq.id, action: "Damage", quantity: 2 });
    const res = await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id });
    assert.equal(res.status, 400);
    assert.equal(res.body.available, 0);
  });

  it("bills the daily rate agreed at rental time, not the current one", async () => {
    const customer = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner, { rentPerDay: 100 });
    const rental = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id })).body;
    await owner.put(`/equipment/${eq.id}`).send({ rent_per_day: 999 });
    await h.backdateRental(rental.id, 2);
    const done = await owner.post(`/rentals/${rental.id}/complete`).send({});
    assert.equal(done.body.gross_amount, 200);
    const invoice = await owner.get(`/invoices/${rental.id}`);
    assert.equal(invoice.body.charges.gross_amount, 200);
    assert.equal(invoice.body.charges.rent_per_day, 100);
  });

  it("computes the return bill: discount cap, late fee, damage, tax and payment", async () => {
    await owner.put("/settings/max_discount_percent").send({ value: "10" });
    const customer = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner, { rentPerDay: 100, stock: 3 });
    const rental = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id, quantity: 2, advance_amount: 100 })).body;
    await h.backdateRental(rental.id, 3);

    const preview = await owner.post("/rentals/return/preview").send({
      rental_ids: [rental.id],
      discount_amount: 100,
      late_fee_amount: 50,
      tax_rate_percent: 18,
      amount_paid: 1000,
    });
    assert.equal(preview.status, 200);
    const line = preview.body.lines[0];
    assert.equal(line.gross_amount, 600, "3 days x 100 x 2 units");
    assert.equal(line.discount_amount, 60, "capped at 10% of gross");
    assert.equal(preview.body.totals.discount_capped, true);
    assert.equal(line.subtotal, 590);
    assert.equal(line.tax_amount, 106.2);
    assert.equal(line.total_amount, 696.2);
    assert.equal(line.paid_now, 596.2, "payment capped at what is owed after the advance");
    assert.equal(line.amount_due, 0);

    const done = await owner.post(`/rentals/${rental.id}/complete`).send({
      discount_amount: 100,
      late_fee_amount: 50,
      tax_rate_percent: 18,
      amount_paid_on_return: 1000,
      damage_amount: 0,
    });
    assert.equal(done.body.total_price, 696.2);
    assert.equal(done.body.payment_status, "Paid");
    assert.match(done.body.invoice_number, /^INV-\d{4}-0001$/);
    assert.equal((await owner.get(`/equipment/${eq.id}`)).body.stock_count, 3);
  });

  it("marks damaged units and logs the damage on return", async () => {
    const customer = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner, { stock: 3 });
    const rental = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id, quantity: 2 })).body;
    const done = await owner.post(`/rentals/${rental.id}/complete`).send({ damage_amount: 75, damage_quantity: 2, damage_remark: "cracked" });
    assert.equal(done.body.damage_amount, 75);
    const after = await owner.get(`/equipment/${eq.id}`);
    assert.equal(after.body.damaged_count, 2);
    assert.equal(after.body.maintenance_logs[0].action, "Damage");
    assert.equal(after.body.maintenance_logs[0].quantity, 2);
  });

  it("refunds an advance that exceeds the final bill and records it", async () => {
    const customer = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner, { rentPerDay: 100 });
    const rental = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id, advance_amount: 500 })).body;
    const done = await owner.post(`/rentals/${rental.id}/complete`).send({});
    assert.equal(done.body.total_price, 100);
    assert.equal(done.body.refund_amount, 400);
    assert.equal(done.body.amount_due, 0);
    const ledger = await payments(owner, rental.id);
    assert.deepEqual(ledger.map((p) => [p.kind, p.amount]), [["advance", 500], ["refund", 400]]);
  });

  it("collects dues later and records each payment in the ledger", async () => {
    const customer = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner, { rentPerDay: 100 });
    const rental = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id })).body;
    await h.backdateRental(rental.id, 3);
    const done = await owner.post(`/rentals/${rental.id}/complete`).send({ amount_paid_on_return: 50 });
    assert.equal(done.body.amount_due, 250);
    assert.equal(done.body.payment_status, "Partial");

    const pay = await owner.post(`/rentals/${rental.id}/payment`).send({ amount_paid: 400, discount_amount: 50 });
    assert.equal(pay.status, 200);
    assert.equal(pay.body.amount_due, 0, "write-off 50 then payment capped at 200");
    assert.equal(pay.body.amount_paid_on_return, 250);
    assert.equal(pay.body.payment_status, "Paid");
    const ledger = await payments(owner, rental.id);
    assert.deepEqual(ledger.map((p) => [p.kind, p.amount]), [["return", 50], ["due", 200]]);
    assert.equal((await owner.post(`/rentals/${rental.id}/payment`).send({ amount_paid: 1 })).body.code, "NOTHING_DUE");
  });

  it("cancelling returns stock and refunds the advance by default", async () => {
    const customer = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner, { stock: 2 });
    const rental = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id, advance_amount: 80 })).body;
    const cancelled = await owner.post(`/rentals/${rental.id}/cancel`).send({});
    assert.equal(cancelled.body.status, "Cancelled");
    assert.equal(cancelled.body.refund_amount, 80);
    assert.equal((await owner.get(`/equipment/${eq.id}`)).body.stock_count, 2);
  });

  it("deleting an active rental puts its stock back", async () => {
    const customer = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner, { stock: 2 });
    const rental = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id })).body;
    assert.equal((await owner.delete(`/rentals/${rental.id}`)).status, 200);
    assert.equal((await owner.get(`/equipment/${eq.id}`)).body.stock_count, 2);
  });

  it("issues sequential invoice numbers per business", async () => {
    const other = await h.registerBusiness(app);
    const customer = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner, { stock: 5 });
    const numbers = [];
    for (let i = 0; i < 3; i++) {
      const r = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id })).body;
      numbers.push((await owner.post(`/rentals/${r.id}/complete`).send({})).body.invoice_number);
    }
    assert.deepEqual(numbers.map((n) => n.slice(-4)), ["0001", "0002", "0003"]);
    const oc = await h.createCustomer(other);
    const oe = await h.createEquipment(other);
    const r = (await other.post("/rentals").send({ customer_id: oc.id, equipment_id: oe.id })).body;
    assert.equal((await other.post(`/rentals/${r.id}/complete`).send({})).body.invoice_number.slice(-4), "0001");
  });

  it("returns an invoice PDF", async () => {
    const customer = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner);
    const r = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id })).body;
    await owner.post(`/rentals/${r.id}/complete`).send({});
    const pdf = await owner.get(`/invoices/${r.id}/pdf`).buffer(true).parse((res, cb) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers["content-type"], "application/pdf");
    assert.equal(pdf.body.subarray(0, 4).toString(), "%PDF");
  });

  it("refuses to return rentals of different customers together", async () => {
    const c1 = await h.createCustomer(owner);
    const c2 = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner, { stock: 5 });
    const r1 = (await owner.post("/rentals").send({ customer_id: c1.id, equipment_id: eq.id })).body;
    const r2 = (await owner.post("/rentals").send({ customer_id: c2.id, equipment_id: eq.id })).body;
    const res = await owner.post("/rentals/return").send({ rental_ids: [r1.id, r2.id] });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "MIXED_CUSTOMERS");
  });

  it("keeps stock correct through sale, scrap and repair", async () => {
    const customer = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner, { stock: 5, purchase: 40 });
    assert.equal((await owner.post(`/equipment/${eq.id}/stock`).send({ quantity_added: "3", unit_price: 50 })).body.stock_count, 8, "numeric strings are coerced, not concatenated");
    await owner.post("/equipment/maintenance").send({ equipment_id: eq.id, action: "Damage", quantity: 2 });
    const sale = await owner.post(`/equipment/${eq.id}/sell`).send({ customer_id: customer.id, quantity: 1, selling_price: 60, amount_paid: 20 });
    assert.equal(sale.status, 201);
    assert.equal(sale.body.amount_due, 40);
    await owner.post(`/equipment/${eq.id}/scrap`).send({ quantity: 1 });
    const repair = await owner.post("/equipment/maintenance").send({ equipment_id: eq.id, action: "Repair", cost: 30 });
    assert.equal(repair.status, 201);
    const after = (await owner.get(`/equipment/${eq.id}`)).body;
    assert.equal(after.stock_count, 6);
    assert.equal(after.damaged_count, 1);
    const summary = await owner.get("/inventory/summary");
    assert.equal(summary.body.total_stock_cost, 5 * 40 + 3 * 50, "sales are not counted as stock cost");
    assert.equal((await owner.post(`/equipment/${eq.id}/scrap`).send({ quantity: 50 })).status, 400);
  });

  it("validates input instead of failing with server errors", async () => {
    assert.equal((await owner.get("/equipment/not-an-id")).status, 400);
    assert.equal((await owner.post("/rentals").send({ customer_id: "x", equipment_id: "y" })).status, 400);
    assert.equal((await owner.post("/rentals").send({ customer_id: "507f1f77bcf86cd799439011", equipment_id: "507f1f77bcf86cd799439011", quantity: -1 })).status, 400);
    const bad = await owner.post("/expenses").set("Content-Type", "application/json").send("{bad json");
    assert.equal(bad.status, 400);
    assert.equal(bad.body.code, "BAD_JSON");
  });
});
