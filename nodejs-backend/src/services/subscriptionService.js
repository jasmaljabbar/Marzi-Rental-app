const Plan = require("../models/Plan");
const Account = require("../models/Account");
const Subscription = require("../models/Subscription");
const stripe = require("./stripeService");
const { getEnv } = require("../config/env");
const { notFound, badRequest } = require("../lib/errors");
const { getLogger } = require("../lib/logger");

async function createCheckout(req, planKey) {
  const plan = await Plan.findOne({ key: planKey, isPublic: true, isActive: true }).lean();
  if (!plan) throw notFound("Plan not found.");
  if (!plan.stripePriceId) throw badRequest("This plan has no Stripe price configured.", "NO_STRIPE_PRICE");
  const frontendUrl = getEnv().FRONTEND_URL.replace(/\/$/, "");
  const account = await Account.findById(req.tenant.accountId);
  const session = await stripe.createCheckoutSession({
    account,
    ownerEmail: req.account.companyEmail || req.user.email || undefined,
    priceId: plan.stripePriceId,
    successUrl: `${frontendUrl}/billing?checkout=success`,
    cancelUrl: `${frontendUrl}/billing?checkout=cancelled`,
  });
  return session.url;
}

async function createPortal(req) {
  const frontendUrl = getEnv().FRONTEND_URL.replace(/\/$/, "");
  const session = await stripe.createPortalSession({ account: req.account, returnUrl: `${frontendUrl}/billing` });
  return session.url;
}

async function cancel(req) {
  const subscription = await Subscription.findById(req.subscription?._id);
  if (!subscription) throw notFound("No subscription found.");
  if (subscription.stripeSubscriptionId && stripe.isConfigured()) {
    await stripe.cancelSubscription(subscription.stripeSubscriptionId, true);
  }
  subscription.cancelAtPeriodEnd = true;
  await subscription.save();
}

function mapStripeStatus(stripeStatus, eventType) {
  if (eventType === "customer.subscription.deleted") return "canceled";
  if (["active", "trialing"].includes(stripeStatus)) return stripeStatus;
  if (stripeStatus === "past_due" || stripeStatus === "unpaid") return "past_due";
  if (stripeStatus === "canceled") return "canceled";
  return "expired";
}

async function planForPrice(priceId) {
  return priceId ? Plan.findOne({ stripePriceId: priceId }).lean() : null;
}

// Keeps the local subscription in sync with Stripe, including which plan the
// customer is actually paying for (checkout used to activate but leave the
// account on its trial plan's limits).
async function applyStripeEvent(event, { retrieveSubscription } = {}) {
  const obj = event.data.object;
  switch (event.type) {
    case "checkout.session.completed": {
      const accountId = obj.metadata?.accountId;
      if (!accountId) return;
      const account = await Account.findById(accountId).lean();
      if (!account?.subscriptionId) return;
      const stripeSub = retrieveSubscription && obj.subscription ? await retrieveSubscription(obj.subscription) : null;
      const plan = await planForPrice(stripeSub?.items?.data?.[0]?.price?.id);
      const update = { status: "active", stripeSubscriptionId: obj.subscription, currentPeriodStart: new Date(), trialEndsAt: null };
      if (obj.customer) update.stripeCustomerId = obj.customer;
      if (plan) update.planId = plan._id;
      if (stripeSub?.current_period_end) update.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
      await Subscription.findByIdAndUpdate(account.subscriptionId, update);
      return;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = await Subscription.findOne({ stripeSubscriptionId: obj.id });
      if (!sub) return;
      sub.status = mapStripeStatus(obj.status, event.type);
      if (obj.current_period_start) sub.currentPeriodStart = new Date(obj.current_period_start * 1000);
      if (obj.current_period_end) sub.currentPeriodEnd = new Date(obj.current_period_end * 1000);
      sub.cancelAtPeriodEnd = Boolean(obj.cancel_at_period_end);
      const plan = await planForPrice(obj.items?.data?.[0]?.price?.id);
      if (plan) sub.planId = plan._id;
      await sub.save();
      return;
    }
    case "invoice.payment_failed": {
      await Subscription.updateOne({ stripeSubscriptionId: obj.subscription }, { $set: { status: "past_due" } });
      return;
    }
    default:
      getLogger().debug({ type: event.type }, "Ignored Stripe event");
  }
}

module.exports = { createCheckout, createPortal, cancel, applyStripeEvent, mapStripeStatus };
