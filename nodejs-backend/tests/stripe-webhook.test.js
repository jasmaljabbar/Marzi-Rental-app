const { describe, it, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");
const Stripe = require("stripe");
const signingSecret = "whsec_local_automated_test_only";

describe("Stripe local signature verification and configuration errors", () => {
  let app;
  let owner;
  before(async () => {
    await h.startDb();
    app = h.buildApp({ STRIPE_SECRET_KEY: "sk_test_local_signature_only", STRIPE_WEBHOOK_SECRET: signingSecret });
  });
  after(h.stopDb);
  beforeEach(async () => { await h.resetDb(); await h.seedPlans(); owner = await h.registerBusiness(app); });

  it("accepts a correctly signed event and rejects a tampered payload without network calls", async () => {
    const payload = JSON.stringify({ id: "evt_local_demo", type: "demo.verification", data: { object: {} } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: signingSecret });
    const valid = await h.request(app).post("/subscription/webhook").set("Content-Type", "application/json").set("Stripe-Signature", signature).send(payload);
    assert.equal(valid.status, 200);
    assert.deepEqual(valid.body, { received: true });
    const invalid = await h.request(app).post("/subscription/webhook").set("Content-Type", "application/json").set("Stripe-Signature", signature).send(payload.replace("evt_local_demo", "evt_tampered"));
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.code, "BAD_SIGNATURE");
  });

  it("returns 400 instead of 500 when a billing portal customer is missing", async () => {
    const response = await owner.post("/subscription/portal").send({});
    assert.equal(response.status, 400);
    assert.equal(response.body.code, "NO_BILLING_PROFILE");
  });
});
