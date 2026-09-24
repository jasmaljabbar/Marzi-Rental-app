// One-off migration for the original single-tenant install: wraps every
// existing user and every existing piece of business data (equipment,
// customers, rentals, expenses, categories — all currently shopId: null) into
// a brand-new Account + Shop, on an unlimited internal plan, so the existing
// admin/staff logins immediately see their real data in the web-dashboard.
//
// Does NOT touch User.role — the mobile app treats role === "admin" as a
// strict string check, so admins stay "admin" (not "owner"); they already
// pass the backend's authorize("admin", "owner") checks either way.
//
// Safe to re-run: no-ops once any user already has an accountId.
//
// Usage:
//   node scripts/migrateToTenant.js "My Company Name" [ownerUsername]
//
// Without ownerUsername, the earliest-created admin becomes the Account's
// ownerUserId (informational only — every existing user is migrated, not just
// this one).
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Account = require("../src/models/Account");
const Shop = require("../src/models/Shop");
const Plan = require("../src/models/Plan");
const Subscription = require("../src/models/Subscription");
const { slugify } = require("../src/lib/text");

// Every collection that belonged to the single-tenant install.
const LEGACY_COLLECTIONS = [
  "categories",
  "equipment",
  "customers",
  "rentals",
  "expenses",
  "recurringexpensetemplates",
  "inventorytransactions",
  "equipmentsales",
  "reservations",
  "reservationnotices",
];

async function main() {
  const companyName = process.argv[2];
  const ownerUsername = process.argv[3];
  if (!companyName) {
    console.error('Usage: node scripts/migrateToTenant.js "My Company Name" [ownerUsername]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const alreadyMigrated = await User.findOne({ accountId: { $ne: null } });
  if (alreadyMigrated) {
    console.log(`Already migrated — user "${alreadyMigrated.username}" already has an account. Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const ownerUser = ownerUsername
    ? await User.findOne({ username: ownerUsername.toLowerCase().trim() })
    : await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
  if (!ownerUser) {
    console.error(ownerUsername ? `No user found with username "${ownerUsername}".` : "No admin user exists yet — nothing to migrate.");
    process.exit(1);
  }

  // Internal, unlimited plan for the business's own account — not shown on
  // the public pricing page (isPublic: false) since it's not for sale.
  const internalPlan = await Plan.findOneAndUpdate(
    { key: "internal" },
    {
      key: "internal",
      name: "Internal",
      description: "Unlimited internal use.",
      price: 0,
      billingCycle: "monthly",
      isPublic: false,
      isActive: true,
      sortOrder: -1,
      limits: { maxShops: -1, maxEquipment: -1, maxCustomers: -1, maxStaffUsers: -1, maxActiveRentalsPerMonth: -1 },
      features: { advancedReports: true, analytics: true, maintenance: true, paymentQrCode: true, apiAccess: true, prioritySupport: true, customBranding: true },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const account = await Account.create({ companyName: companyName.trim(), slug: slugify(companyName) || "business", ownerUserId: ownerUser._id });
  const shop = await Shop.create({ accountId: account._id, name: `${companyName.trim()} - Main Shop` });
  const subscription = await Subscription.create({
    accountId: account._id,
    planId: internalPlan._id,
    status: "active",
  });
  account.subscriptionId = subscription._id;
  await account.save();

  // Every existing user predates multi-tenancy, so they all belong to this
  // one business by definition — attach them all, not just the named owner.
  const userResult = await User.updateMany({ accountId: null, isPlatformAdmin: { $ne: true } }, { $set: { accountId: account._id } });

  // Every existing shopId: null record is this business's real data. Raw
  // collections are used so the tenant guard (which requires accountId in
  // every query) doesn't apply to this one-off platform operation.
  const db = mongoose.connection.db;
  const counts = {};
  for (const name of LEGACY_COLLECTIONS) {
    const res = await db.collection(name).updateMany({ shopId: null }, { $set: { shopId: shop._id, accountId: account._id } });
    counts[name] = res.modifiedCount;
  }
  await db.collection("settings").updateMany({ accountId: null }, { $set: { accountId: account._id } });
  const [equipmentRes, customerRes, categoryRes, rentalRes, expenseRes] = ["equipment", "customers", "categories", "rentals", "expenses"].map((n) => ({ modifiedCount: counts[n] }));

  console.log(`Created Account "${account.companyName}" (${account._id}) with Shop "${shop.name}" (${shop._id}) on the Internal plan.`);
  console.log(`Migrated ${userResult.modifiedCount} user(s) onto this account — they keep their existing username/password/role.`);
  console.log(`Migrated data: ${equipmentRes.modifiedCount} equipment, ${customerRes.modifiedCount} customers, ${categoryRes.modifiedCount} categories, ${rentalRes.modifiedCount} rentals, ${expenseRes.modifiedCount} expenses.`);
  console.log(`Log into the web dashboard with any existing username/password — the data above will show up under "${shop.name}".`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
