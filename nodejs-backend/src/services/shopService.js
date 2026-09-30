const Shop = require("../models/Shop");
const User = require("../models/User");
const Equipment = require("../models/Equipment");
const Customer = require("../models/Customer");
const Rental = require("../models/Rental");
const Expense = require("../models/Expense");
const Category = require("../models/Category");
const RecurringExpenseTemplate = require("../models/RecurringExpenseTemplate");
const Setting = require("../models/Setting");
const { badRequest, conflict, notFound } = require("../lib/errors");

// Owners/admins see every shop (including inactive ones, so they can be
// reactivated); pinned staff only see their own.
async function listShops(req) {
  const filter = { accountId: req.tenant.accountId };
  if (req.user.role === "staff") filter._id = { $in: req.tenant.shopIds };
  return Shop.find(filter).sort({ createdAt: 1 }).lean();
}

async function findShop(req, id) {
  if (req.user.role === "staff" && !req.tenant.shopIds.some((shopId) => String(shopId) === String(id))) {
    throw notFound("Shop not found.");
  }
  const shop = await Shop.findOne({ _id: id, accountId: req.tenant.accountId });
  if (!shop) throw notFound("Shop not found.");
  return shop;
}

async function createShop(req, { name, address, phone }) {
  const shop = await Shop.create({ accountId: req.tenant.accountId, name, address: address ?? null, phone: phone ?? null });
  return shop.toObject();
}

// Deactivating must never leave the business without a usable shop or strand
// staff pinned to it (either would lock people out).
async function assertCanDeactivate(req, shop) {
  const activeCount = await Shop.countDocuments({ accountId: req.tenant.accountId, isActive: true });
  if (shop.isActive && activeCount <= 1) {
    throw badRequest("You can't deactivate your only active shop.", "LAST_ACTIVE_SHOP");
  }
  const pinned = await User.countDocuments({ accountId: req.tenant.accountId, shopId: shop._id });
  if (pinned > 0) {
    throw conflict(`${pinned} team member(s) are assigned to this shop. Reassign them first.`, "SHOP_HAS_STAFF", { pinned_users: pinned });
  }
}

async function updateShop(req, id, { name, address, phone, is_active }) {
  const shop = await findShop(req, id);
  if (is_active === false && shop.isActive) await assertCanDeactivate(req, shop);
  if (name !== undefined) shop.name = name;
  if (address !== undefined) shop.address = address;
  if (phone !== undefined) shop.phone = phone;
  if (is_active !== undefined) shop.isActive = is_active;
  await shop.save();
  return shop.toObject();
}

// Only empty shops can be deleted; a shop with history is deactivated instead,
// so rentals, invoices and expenses are never orphaned.
async function deleteShop(req, id) {
  const shop = await findShop(req, id);
  const total = await Shop.countDocuments({ accountId: req.tenant.accountId });
  if (total <= 1) throw badRequest("Cannot delete your only shop.", "LAST_SHOP");
  if (shop.isActive) await assertCanDeactivate(req, shop);
  const scope = { accountId: req.tenant.accountId, shopId: shop._id };
  const [equipment, customers, rentals, expenses, categories, recurringExpenses, settings] = await Promise.all([
    Equipment.countDocuments(scope),
    Customer.countDocuments(scope),
    Rental.countDocuments(scope),
    Expense.countDocuments(scope),
    Category.countDocuments(scope),
    RecurringExpenseTemplate.countDocuments(scope),
    Setting.countDocuments(scope),
  ]);
  if (equipment + customers + rentals + expenses + categories + recurringExpenses + settings > 0) {
    throw conflict("This shop has records. Deactivate it instead of deleting it.", "SHOP_NOT_EMPTY", {
      equipment,
      customers,
      rentals,
      expenses,
      categories,
      recurring_expenses: recurringExpenses,
      settings,
    });
  }
  await Shop.deleteOne({ _id: shop._id, accountId: req.tenant.accountId });
}

async function shopSummary(req, id) {
  const shop = await findShop(req, id);
  const scope = { accountId: req.tenant.accountId, shopId: shop._id };
  const [equipmentCount, customerCount, activeRentals] = await Promise.all([
    Equipment.countDocuments({ ...scope, isArchived: { $ne: true } }),
    Customer.countDocuments({ ...scope, isArchived: { $ne: true } }),
    Rental.countDocuments({ ...scope, status: "Active" }),
  ]);
  return { id: shop._id, name: shop.name, equipment_count: equipmentCount, customer_count: customerCount, active_rentals: activeRentals };
}

module.exports = { listShops, createShop, updateShop, deleteShop, shopSummary };
