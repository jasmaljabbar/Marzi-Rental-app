const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const platform = require("../services/platformService");
const { planDto, subscriptionDto } = require("../dto");
const { defaultLimitsMap, defaultFeaturesMap } = require("../config/planCatalog");
const { notFound, conflict } = require("../lib/errors");
const { wrapController } = require("../lib/http");

function planFields(body) {
  const map = {
    key: "key",
    name: "name",
    description: "description",
    price: "price",
    billing_cycle: "billingCycle",
    currency: "currency",
    trial_days: "trialDays",
    stripe_price_id: "stripePriceId",
    is_public: "isPublic",
    is_active: "isActive",
    sort_order: "sortOrder",
  };
  const fields = {};
  for (const [from, to] of Object.entries(map)) if (body[from] !== undefined) fields[to] = body[from];
  return fields;
}

module.exports = wrapController({
  async dashboard(req, res) {
    res.json(await platform.dashboard(req.query));
  },
  async listPlans(_req, res) {
    res.json((await Plan.find().sort({ sortOrder: 1 }).lean()).map(planDto));
  },
  async createPlan(req, res) {
    if (await Plan.exists({ key: req.body.key })) throw conflict(`A plan with key "${req.body.key}" already exists.`, "DUPLICATE");
    const limits = defaultLimitsMap();
    for (const [k, v] of Object.entries(req.body.limits || {})) limits.set(k, v);
    const features = defaultFeaturesMap();
    for (const [k, v] of Object.entries(req.body.features || {})) features.set(k, v);
    const plan = await Plan.create({ ...planFields(req.body), limits, features });
    res.status(201).json(planDto(plan));
  },
  async updatePlan(req, res) {
    const plan = await Plan.findById(req.params.id);
    if (!plan) throw notFound("Plan not found.");
    for (const [k, v] of Object.entries(req.body.limits || {})) plan.limits.set(k, v);
    for (const [k, v] of Object.entries(req.body.features || {})) plan.features.set(k, v);
    Object.assign(plan, planFields(req.body));
    await plan.save();
    res.json(planDto(plan));
  },
  async deletePlan(req, res) {
    const refCount = await Subscription.countDocuments({ planId: req.params.id });
    if (refCount > 0) throw conflict(`${refCount} account(s) are on this plan. Deactivate it instead of deleting.`, "PLAN_IN_USE");
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) throw notFound("Plan not found.");
    res.json({ message: "Plan deleted." });
  },
  async listAccounts(_req, res) {
    const { accounts, subsByAccount, plansById, shopCountByAccount, ownersById } = await platform.listAccounts();
    res.json(
      accounts.map((account) => {
        const sub = subsByAccount.get(String(account._id));
        const plan = sub ? plansById.get(String(sub.planId)) : null;
        const presented = subscriptionDto(sub);
        return {
          id: account._id,
          company_name: account.companyName,
          business_code: account.slug || null,
          owner_username: ownersById.get(String(account.ownerUserId)) || null,
          shop_count: shopCountByAccount.get(String(account._id)) || 0,
          plan: plan ? { key: plan.key, name: plan.name } : null,
          status: presented?.status || null,
          trial_ends_at: presented?.trial_ends_at || null,
          remaining_days: presented?.remaining_days ?? null,
          auto_renew: presented?.auto_renew ?? null,
          created_at: account.createdAt,
        };
      })
    );
  },
  async getAccount(req, res) {
    const { account, subscription, plan, shops, users, usage } = await platform.getAccount(req.params.id);
    res.json({
      id: account._id,
      company_name: account.companyName,
      business_code: account.slug || null,
      created_at: account.createdAt,
      subscription: subscriptionDto(subscription),
      plan: planDto(plan),
      usage,
      shops: shops.map((s) => ({ id: s._id, name: s.name, is_active: s.isActive, created_at: s.createdAt })),
      users: users.map((u) => ({ id: u._id, username: u.username, role: u.role, created_at: u.createdAt, last_login_at: u.lastLoginAt || null })),
    });
  },
  async changePlan(req, res) {
    const { plan, subscription } = await platform.changePlan(req.params.id, req.body);
    res.json({ message: `Moved to the ${plan.name} plan.`, subscription: subscriptionDto(subscription) });
  },
  async suspend(req, res) {
    await platform.setSuspended(req.params.id, true);
    res.json({ message: "Account suspended." });
  },
  async reactivate(req, res) {
    await platform.setSuspended(req.params.id, false);
    res.json({ message: "Account reactivated." });
  },
  async deleteAccount(req, res) {
    await platform.deleteAccount(req.params.id, req.user);
    res.json({ message: "Account and all associated data deleted." });
  },
});
