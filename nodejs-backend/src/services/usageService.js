const Shop = require("../models/Shop");
const Equipment = require("../models/Equipment");
const Customer = require("../models/Customer");
const User = require("../models/User");
const Rental = require("../models/Rental");

function startOfUtcMonth(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// Single definition of "how much of the plan is used", shared by the limit
// middleware and the usage meters so they can never disagree. Team members
// count admins and staff; the owner is not counted against the limit.
async function getUsage(accountId, shopIds) {
  const [shops, equipment, customers, staffUsers, rentalsThisMonth] = await Promise.all([
    Shop.countDocuments({ accountId, isActive: true }),
    Equipment.countDocuments({ accountId, shopId: { $in: shopIds }, isArchived: { $ne: true } }),
    Customer.countDocuments({ accountId, shopId: { $in: shopIds }, isArchived: { $ne: true } }),
    User.countDocuments({ accountId, role: { $in: ["admin", "staff"] } }),
    Rental.countDocuments({ accountId, shopId: { $in: shopIds }, rentedAt: { $gte: startOfUtcMonth() } }),
  ]);
  return { shops, equipment, customers, staffUsers, activeRentalsThisMonth: rentalsThisMonth };
}

module.exports = { getUsage, startOfUtcMonth };
