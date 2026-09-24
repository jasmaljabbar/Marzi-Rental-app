// Thin wrapper around the Stripe SDK. Stays in "mock mode" (throws a clear,
// caught error instead of crashing the process) when STRIPE_SECRET_KEY isn't
// set, so the rest of the subscription system — trials, plan limits, the
// dashboard UI — works out of the box before anyone wires up real billing.
const { getEnv } = require("../config/env");

let client;
function getClient() {
  if (client !== undefined) return client;
  const key = getEnv().STRIPE_SECRET_KEY;
  client = key ? require("stripe")(key) : null;
  return client;
}

function assertConfigured() {
  const stripe = getClient();
  if (!stripe) {
    const err = new Error("Billing is not configured. Set STRIPE_SECRET_KEY to enable checkout.");
    err.status = 501;
    throw err;
  }
  return stripe;
}

async function getOrCreateCustomer(account, ownerEmail) {
  const stripe = assertConfigured();
  if (account.stripeCustomerId) return account.stripeCustomerId;

  const customer = await stripe.customers.create({
    name: account.companyName,
    email: ownerEmail,
    metadata: { accountId: account._id.toString() },
  });
  account.stripeCustomerId = customer.id;
  await account.save();
  return customer.id;
}

async function createCheckoutSession({ account, ownerEmail, priceId, successUrl, cancelUrl }) {
  const stripe = assertConfigured();
  const customerId = await getOrCreateCustomer(account, ownerEmail);

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { accountId: account._id.toString() },
  });
}

async function createPortalSession({ account, returnUrl }) {
  const stripe = assertConfigured();
  if (!account.stripeCustomerId) {
    const err = new Error("This account has no billing profile yet.");
    err.status = 400;
    throw err;
  }
  return stripe.billingPortal.sessions.create({
    customer: account.stripeCustomerId,
    return_url: returnUrl,
  });
}

function verifyWebhookSignature(rawBody, signature) {
  const stripe = assertConfigured();
  const secret = getEnv().STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    const err = new Error("STRIPE_WEBHOOK_SECRET is not set.");
    err.status = 501;
    throw err;
  }
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

async function cancelSubscription(stripeSubscriptionId, atPeriodEnd = true) {
  const stripe = assertConfigured();
  if (atPeriodEnd) {
    return stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });
  }
  return stripe.subscriptions.cancel(stripeSubscriptionId);
}

async function retrieveSubscription(id) {
  const stripe = assertConfigured();
  return stripe.subscriptions.retrieve(id);
}

async function listInvoices(customerId, limit = 12) {
  const stripe = assertConfigured();
  return stripe.invoices.list({ customer: customerId, limit });
}

module.exports = {
  isConfigured: () => Boolean(getClient()),
  retrieveSubscription,
  createCheckoutSession,
  createPortalSession,
  verifyWebhookSignature,
  cancelSubscription,
  listInvoices,
};
