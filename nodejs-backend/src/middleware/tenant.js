const mongoose = require("mongoose");
const Account = require("../models/Account");
const Shop = require("../models/Shop");
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const { forbidden, unauthorized } = require("../lib/errors");
const { asyncHandler } = require("../lib/http");

const { ObjectId } = mongoose.Types;

// Resolves which business and shop a request acts on. Fails closed: a user
// without a business, or without an accessible active shop, is refused rather
// than falling back to an unscoped query (the old behaviour that leaked data).
//
// Shop selection: staff pinned to a shop always use it; everyone else uses the
// X-Shop-Id header (which must be one of their shops) or their first shop.
const requireTenant = asyncHandler(async (req, _res, next) => {
  const user = req.user;
  if (!user) throw unauthorized();
  if (!user.accountId) {
    throw forbidden("This login isn't linked to a business. Platform admins use the admin console.", "NO_ACCOUNT");
  }

  const [account, shops] = await Promise.all([
    Account.findById(user.accountId).lean(),
    Shop.find({ accountId: user.accountId, isActive: true }).select("_id").sort({ createdAt: 1 }).lean(),
  ]);
  if (!account) throw forbidden("This login isn't linked to a business.", "NO_ACCOUNT");

  const accountShopIds = shops.map((s) => String(s._id));
  let shopIds = accountShopIds;
  if (user.role === "staff" && user.shopId) {
    const pinned = String(user.shopId);
    if (!accountShopIds.includes(pinned)) {
      throw forbidden("Your shop is not active. Ask an owner or admin to reassign you.", "NO_ACTIVE_SHOP");
    }
    shopIds = [pinned];
  }
  if (shopIds.length === 0) {
    throw forbidden("This business has no active shop. Ask an owner to reactivate one.", "NO_ACTIVE_SHOP");
  }

  const requested = req.get("x-shop-id");
  if (requested && !shopIds.includes(requested)) {
    throw forbidden("You don't have access to that shop.", "SHOP_NOT_ACCESSIBLE");
  }
  const shopId = requested || shopIds[0];

  const subscription = account.subscriptionId ? await Subscription.findById(account.subscriptionId).lean() : null;
  const plan = subscription ? await Plan.findById(subscription.planId).lean() : null;

  req.tenant = Object.freeze({
    accountId: account._id,
    shopId: new ObjectId(shopId),
    shopIds: Object.freeze(shopIds.map((id) => new ObjectId(id))),
    accountShopIds: Object.freeze(accountShopIds.map((id) => new ObjectId(id))),
    userId: user._id,
    role: user.role,
    username: user.username,
  });
  req.account = account;
  req.subscription = subscription;
  req.plan = plan;
  req.shopId = shopId;
  next();
});

module.exports = { requireTenant };
