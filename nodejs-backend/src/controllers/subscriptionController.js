const subscriptions = require("../services/subscriptionService");
const stripe = require("../services/stripeService");
const { planDto, subscriptionDto } = require("../dto");
const { notFound } = require("../lib/errors");
const { getLogger } = require("../lib/logger");
const { wrapController } = require("../lib/http");

const handlers = wrapController({
  async get(req, res) {
    if (!req.subscription) throw notFound("No subscription found.");
    res.json({ ...subscriptionDto(req.subscription), plan: planDto(req.plan) });
  },
  async checkout(req, res) {
    res.json({ checkout_url: await subscriptions.createCheckout(req, req.body.plan_key) });
  },
  async portal(req, res) {
    res.json({ portal_url: await subscriptions.createPortal(req) });
  },
  async invoices(req, res) {
    if (!stripe.isConfigured() || !req.account.stripeCustomerId) return res.json([]);
    const result = await stripe.listInvoices(req.account.stripeCustomerId);
    res.json(
      result.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        amount_paid: inv.amount_paid / 100,
        currency: inv.currency,
        status: inv.status,
        created_at: new Date(inv.created * 1000),
        hosted_invoice_url: inv.hosted_invoice_url,
        invoice_pdf: inv.invoice_pdf,
      }))
    );
  },
  async cancel(req, res) {
    await subscriptions.cancel(req);
    res.json({ message: "Your subscription will be cancelled at the end of the current billing period." });
  },
});

// Stripe calls this directly with the raw body (mounted before express.json).
async function webhook(req, res) {
  let event;
  try {
    event = stripe.verifyWebhookSignature(req.body, req.headers["stripe-signature"]);
  } catch (err) {
    return res.status(400).json({ detail: `Webhook signature verification failed: ${err.message}`, code: "BAD_SIGNATURE" });
  }
  try {
    await subscriptions.applyStripeEvent(event, { retrieveSubscription: stripe.retrieveSubscription });
    res.json({ received: true });
  } catch (err) {
    getLogger().error({ err, type: event.type }, "Stripe webhook handling failed");
    res.status(500).json({ detail: "Webhook handling failed.", code: "WEBHOOK_FAILED" });
  }
}

module.exports = { ...handlers, webhook };
