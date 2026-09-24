const mongoose = require("mongoose");
const Account = require("../models/Account");
const Shop = require("../models/Shop");
const User = require("../models/User");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const FileObject = require("../models/FileObject");
const { getUsage } = require("./usageService");
const { getDriver } = require("../storage");
const { notFound, badRequest } = require("../lib/errors");
const { getLogger } = require("../lib/logger");

// Every collection holding a business's data. Account deletion walks all of
// them (the old cascade only covered five, leaving orphans behind).
const TENANT_MODELS = [
  "Category",
  "Equipment",
  "Customer",
  "Rental",
  "Payment",
  "Expense",
  "RecurringExpenseTemplate",
  "InventoryTransaction",
  "MaintenanceLog",
  "EquipmentSale",
  "Reservation",
  "ReservationNotice",
  "Setting",
  "FileObject",
];

const skip = { skipTenantCheck: true };

async function listAccounts() {
  const accounts = await Account.find().sort({ createdAt: -1 }).lean();
  const ids = accounts.map((a) => a._id);
  const [subscriptions, shopCounts, owners] = await Promise.all([
    Subscription.find({ accountId: { $in: ids } }).lean(),
    Shop.aggregate([{ $group: { _id: "$accountId", count: { $sum: 1 } } }]).option(skip),
    User.find({ _id: { $in: accounts.map((a) => a.ownerUserId) } }).select("_id username").lean(),
  ]);
  const plans = await Plan.find({ _id: { $in: subscriptions.map((s) => s.planId) } }).lean();
  return {
    accounts,
    subsByAccount: new Map(subscriptions.map((s) => [String(s.accountId), s])),
    plansById: new Map(plans.map((p) => [String(p._id), p])),
    shopCountByAccount: new Map(shopCounts.map((s) => [String(s._id), s.count])),
    ownersById: new Map(owners.map((u) => [String(u._id), u.username])),
  };
}

async function getAccount(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound("Account not found.");
  const account = await Account.findById(id).lean();
  if (!account) throw notFound("Account not found.");
  const [subscription, shops, users] = await Promise.all([
    account.subscriptionId ? Subscription.findById(account.subscriptionId).lean() : null,
    Shop.find({ accountId: account._id }).select("_id name isActive createdAt").lean(),
    User.find({ accountId: account._id }).select("_id username role createdAt lastLoginAt").lean(),
  ]);
  const plan = subscription ? await Plan.findById(subscription.planId).lean() : null;
  const usage = await getUsage(account._id, shops.map((s) => s._id));
  return { account, subscription, plan, shops, users, usage };
}

async function changePlan(id, { plan_id, start_date, expiry_date, auto_renew }) {
  const plan = await Plan.findOne({ _id: plan_id, isActive: true }).lean();
  if (!plan) throw notFound("Plan not found or no longer active.");
  const account = await Account.findById(id).lean();
  if (!account?.subscriptionId) throw notFound("Account has no subscription to update.");
  const periodStart = start_date || new Date();
  if (expiry_date && expiry_date <= periodStart) throw badRequest("Expiry date must be after the start date.", "VALIDATION_ERROR");
  const update = {
    planId: plan._id,
    status: "active",
    trialEndsAt: null,
    currentPeriodStart: periodStart,
    cancelAtPeriodEnd: auto_renew === false,
    currentPeriodEnd: expiry_date || null,
  };
  const subscription = await Subscription.findByIdAndUpdate(account.subscriptionId, update, { new: true }).lean();
  return { plan, subscription };
}

async function setSuspended(id, suspended) {
  const account = await Account.findById(id).lean();
  if (!account?.subscriptionId) throw notFound("Account has no subscription.");
  await Subscription.findByIdAndUpdate(account.subscriptionId, { status: suspended ? "suspended" : "active" });
}

// Irreversible: removes the business and every record and file it owns.
// Platform admins who also belonged to it keep their login.
async function deleteAccount(id, actor) {
  const account = await Account.findById(id).lean();
  if (!account) throw notFound("Account not found.");
  const accountId = account._id;

  const files = await FileObject.find({ accountId }).select("key thumbKey").lean();
  for (const name of TENANT_MODELS) {
    await mongoose.model(name).deleteMany({ accountId }).setOptions(skip);
  }
  await Shop.deleteMany({ accountId });
  await User.updateMany({ accountId, isPlatformAdmin: true }, { $set: { accountId: null, shopId: null }, $inc: { tokenVersion: 1 } });
  await User.deleteMany({ accountId, isPlatformAdmin: { $ne: true } });
  if (account.subscriptionId) await Subscription.findByIdAndDelete(account.subscriptionId);
  await Account.deleteOne({ _id: accountId });

  const driver = getDriver();
  for (const file of files) {
    for (const key of [file.key, file.thumbKey].filter(Boolean)) {
      await driver.delete(key).catch((err) => getLogger().warn({ err, key }, "File cleanup failed"));
    }
  }
  getLogger().warn({ accountId: String(accountId), actor: String(actor?._id), company: account.companyName }, "Tenant account deleted");
}

function monthlyEquivalent(plan) {
  if (!plan) return 0;
  return plan.billingCycle === "yearly" ? plan.price / 12 : plan.price;
}

async function dashboard({ expiring_within_days = 7 }) {
  const horizon = new Date(Date.now() + expiring_within_days * 24 * 60 * 60 * 1000);
  const subscriptions = await Subscription.find().lean();
  const plans = await Plan.find({ _id: { $in: subscriptions.map((s) => s.planId) } }).lean();
  const plansById = new Map(plans.map((p) => [String(p._id), p]));
  const statusCounts = {};
  let mrr = 0;
  let trialingCount = 0;
  let expiringSoon = 0;
  for (const sub of subscriptions) {
    statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
    if (sub.status === "active" || sub.status === "past_due") mrr += monthlyEquivalent(plansById.get(String(sub.planId)));
    if (sub.status === "trialing") {
      trialingCount += 1;
      if (sub.trialEndsAt && sub.trialEndsAt <= horizon) expiringSoon += 1;
    } else if (sub.currentPeriodEnd && sub.currentPeriodEnd <= horizon && !["canceled", "expired"].includes(sub.status)) {
      expiringSoon += 1;
    }
  }
  return {
    total_accounts: subscriptions.length,
    mrr: Math.round(mrr * 100) / 100,
    status_counts: statusCounts,
    active_count: statusCounts.active || 0,
    trialing_count: trialingCount,
    expiring_soon_count: expiringSoon,
    expiring_within_days,
  };
}

module.exports = { listAccounts, getAccount, changePlan, setSuspended, deleteAccount, dashboard, TENANT_MODELS };
