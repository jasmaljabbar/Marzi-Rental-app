// Seeds (or updates) the SaaS plan catalog. Safe to re-run — upserts by `key`
// so it can be used both for first-time setup and to push limit/price
// changes, including backfilling new registry keys (see
// src/config/planCatalog.js) onto plans seeded before that key existed.
//
// Usage:
//   node scripts/seedPlans.js
const mongoose = require("mongoose");
const Plan = require("../src/models/Plan");

const PLANS = [
  {
    key: "trial",
    name: "Free Trial",
    description: "Full access to the Starter plan's features for a limited time.",
    price: 0,
    billingCycle: "monthly",
    trialDays: 14,
    isPublic: false, // internal — assigned automatically on signup, not shown on the pricing page
    isActive: true,
    sortOrder: 0,
    limits: { maxShops: 1, maxEquipment: 50, maxCustomers: 200, maxStaffUsers: 2, maxActiveRentalsPerMonth: 100 },
    features: { advancedReports: false, analytics: true, maintenance: true, paymentQrCode: true, apiAccess: false, prioritySupport: false, customBranding: false },
  },
  {
    key: "starter",
    name: "Starter",
    description: "For a single shop just getting started.",
    price: 19,
    billingCycle: "monthly",
    trialDays: null,
    isActive: true,
    sortOrder: 1,
    limits: { maxShops: 1, maxEquipment: 50, maxCustomers: 200, maxStaffUsers: 2, maxActiveRentalsPerMonth: 100 },
    features: { advancedReports: false, analytics: true, maintenance: true, paymentQrCode: true, apiAccess: false, prioritySupport: false, customBranding: false },
  },
  {
    key: "professional",
    name: "Professional",
    description: "For growing businesses running multiple shops.",
    price: 49,
    billingCycle: "monthly",
    trialDays: null,
    isActive: true,
    sortOrder: 2,
    limits: { maxShops: 5, maxEquipment: 500, maxCustomers: 2000, maxStaffUsers: 10, maxActiveRentalsPerMonth: 1000 },
    features: { advancedReports: true, analytics: true, maintenance: true, paymentQrCode: true, apiAccess: false, prioritySupport: false, customBranding: false },
  },
  {
    key: "enterprise",
    name: "Enterprise",
    description: "Unlimited shops and usage, with priority support.",
    price: 199,
    billingCycle: "monthly",
    trialDays: null,
    isActive: true,
    sortOrder: 3,
    limits: { maxShops: -1, maxEquipment: -1, maxCustomers: -1, maxStaffUsers: -1, maxActiveRentalsPerMonth: -1 },
    features: { advancedReports: true, analytics: true, maintenance: true, paymentQrCode: true, apiAccess: true, prioritySupport: true, customBranding: true },
  },
];

async function main() {
  require("dotenv").config();
  await mongoose.connect(process.env.MONGODB_URI);

  for (const plan of PLANS) {
    const { limits, features, ...rest } = plan;
    const existing = await Plan.findOne({ key: plan.key });
    if (existing) {
      Object.assign(existing, rest);
      for (const [k, v] of Object.entries(limits)) existing.limits.set(k, v);
      for (const [k, v] of Object.entries(features)) existing.features.set(k, v);
      await existing.save();
    } else {
      await Plan.create({ ...rest, limits: new Map(Object.entries(limits)), features: new Map(Object.entries(features)) });
    }
    console.log(`Upserted plan "${plan.key}".`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { PLANS };
