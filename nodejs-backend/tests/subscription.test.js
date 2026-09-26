const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");
const Subscription = require("../src/models/Subscription");

describe("subscription gates and billing sync (P1-5)", () => {
  let app;
  let owner;
  let plans;
  before(async () => {
    await h.startDb();
    app = h.buildApp();
  });
  after(h.stopDb);
  beforeEach(async () => {
    await h.resetDb();
    plans = await h.seedPlans();
    owner = await h.registerBusiness(app);
  });

  it("blocks writes but not reads once the trial has ended", async () => {
    await Subscription.updateOne({ accountId: owner.info.account_id }, { $set: { trialEndsAt: new Date(Date.now() - 1000) } });
    const write = await owner.post("/customers").send({ name: "X", phone: "9875551234" });
    assert.equal(write.status, 402);
    assert.equal(write.body.code, "TRIAL_EXPIRED");
    assert.equal((await owner.get("/customers")).status, 200);
    assert.equal((await owner.get("/subscription")).status, 200, "billing stays reachable");
  });

  it("locks out suspended businesses from changes", async () => {
    await Subscription.updateOne({ accountId: owner.info.account_id }, { $set: { status: "suspended" } });
    const res = await owner.post("/categories").send({ name: "X" });
    assert.equal(res.status, 402);
    assert.equal(res.body.code, "ACCOUNT_SUSPENDED");
  });

  it("enforces plan limits", async () => {
    const Plan = require("../src/models/Plan");
    await Plan.updateOne({ key: "trial" }, { $set: { "limits.maxCustomers": 1 } });
    await h.createCustomer(owner);
    const res = await owner.post("/customers").send({ name: "Second", phone: "9875559876" });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, "PLAN_LIMIT_REACHED");
  });

  it("checks the whole batch against the monthly rental limit", async () => {
    const Plan = require("../src/models/Plan");
    await Plan.updateOne({ key: "trial" }, { $set: { "limits.maxActiveRentalsPerMonth": 2 } });
    const customer = await h.createCustomer(owner);
    const items = [];
    for (let i = 0; i < 3; i++) items.push({ equipment_id: (await h.createEquipment(owner)).id });
    const res = await owner.post("/rentals/bulk").send({ customer_id: customer.id, items });
    assert.equal(res.status, 403);
  });

  it("moves a paying customer onto the plan they bought", async () => {
    const { applyStripeEvent } = require("../src/services/subscriptionService");
    await applyStripeEvent(
      { type: "checkout.session.completed", data: { object: { metadata: { accountId: String(owner.info.account_id) }, subscription: "sub_1", customer: "cus_1" } } },
      { retrieveSubscription: async () => ({ items: { data: [{ price: { id: "price_pro" } }] }, current_period_end: 2000000000 }) }
    );
    const sub = await Subscription.findOne({ accountId: owner.info.account_id }).lean();
    assert.equal(sub.status, "active");
    assert.equal(String(sub.planId), String(plans.pro._id));
    assert.equal(sub.trialEndsAt, null);

    await applyStripeEvent({ type: "customer.subscription.deleted", data: { object: { id: "sub_1", status: "canceled" } } });
    assert.equal((await Subscription.findOne({ accountId: owner.info.account_id }).lean()).status, "canceled");
  });

  it("rejects unsigned Stripe webhooks", async () => {
    const res = await h.request(app).post("/subscription/webhook").set("Content-Type", "application/json").send('{"type":"x"}');
    assert.equal(res.status, 400);
  });
});
