const { getUsage } = require("../services/usageService");
const { LIMIT_KEY_BY_RESOURCE } = require("../config/planCatalog");
const { paymentRequired, forbidden } = require("../lib/errors");
const { asyncHandler } = require("../lib/http");

// `past_due` keeps working during Stripe's retry window.
const USABLE_STATUSES = ["trialing", "active", "past_due"];

function subscriptionProblem(subscription) {
  if (!subscription) {
    return paymentRequired("No active subscription. Please choose a plan to continue.", "NO_SUBSCRIPTION");
  }
  if (subscription.status === "suspended") {
    return paymentRequired("This account has been suspended. Contact support for help.", "ACCOUNT_SUSPENDED");
  }
  if (subscription.status === "trialing" && subscription.trialEndsAt && new Date(subscription.trialEndsAt) < new Date()) {
    return paymentRequired("Your free trial has ended. Contact us to upgrade and keep using the app.", "TRIAL_EXPIRED");
  }
  if (
    subscription.status === "active" &&
    subscription.currentPeriodEnd &&
    subscription.cancelAtPeriodEnd &&
    new Date(subscription.currentPeriodEnd) < new Date()
  ) {
    return paymentRequired("Your subscription has ended. Contact us to continue.", "SUBSCRIPTION_INACTIVE");
  }
  if (!USABLE_STATUSES.includes(subscription.status)) {
    return paymentRequired("Your subscription is inactive. Contact us to continue.", "SUBSCRIPTION_INACTIVE");
  }
  return null;
}

// A lapsed or suspended business can still sign in, read and export its data,
// but can't create or change anything until the subscription is restored.
function requireWritableSubscription(req, _res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const problem = subscriptionProblem(req.subscription);
  next(problem || undefined);
}

function limitOf(plan, key) {
  const limits = plan?.limits;
  if (!limits) return undefined;
  return limits instanceof Map ? limits.get(key) : limits[key];
}

function featureOf(plan, key) {
  const features = plan?.features;
  if (!features) return undefined;
  return features instanceof Map ? features.get(key) : features[key];
}

// Blocks a create once the plan's numeric limit is reached. -1 or unset means
// unlimited. `countNew` lets bulk endpoints check the whole batch.
function enforceLimit(resource, { countNew = () => 1 } = {}) {
  const limitKey = LIMIT_KEY_BY_RESOURCE[resource];
  if (!limitKey) throw new Error(`Unknown limit resource: ${resource}`);

  return asyncHandler(async (req, _res, next) => {
    const max = limitOf(req.plan, limitKey);
    if (max === undefined || max === null || max === -1) return next();
    const usage = await getUsage(req.tenant.accountId, req.tenant.accountShopIds);
    const current = usage[resource];
    if (current + countNew(req) > max) {
      throw forbidden(
        `You've reached the ${req.plan.name} plan limit of ${max} for this feature. Upgrade your plan to add more.`,
        "PLAN_LIMIT_REACHED",
        { resource, limit: max, current }
      );
    }
    next();
  });
}

function requireFeature(featureKey) {
  return (req, _res, next) => {
    if (featureOf(req.plan, featureKey)) return next();
    next(
      forbidden("This feature isn't included in your current plan. Upgrade to unlock it.", "FEATURE_NOT_AVAILABLE", {
        feature: featureKey,
      })
    );
  };
}

module.exports = { requireWritableSubscription, enforceLimit, requireFeature, subscriptionProblem, featureOf, limitOf };
