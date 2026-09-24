const mongoose = require("mongoose");
const { BILLING_CYCLES, defaultLimitsMap, defaultFeaturesMap } = require("../config/planCatalog");

// A catalog entry, not a per-customer record — one document per tier
// (e.g. "trial", "starter", "professional", "enterprise"). Managed through
// the platform admin's Plan CRUD (see controllers/planAdminController.js)
// and seeded via scripts/seedPlans.js for local/dev setup.
//
// `limits`/`features` are Mongoose Maps rather than fixed sub-schemas so a
// brand-new limit/feature key (added to config/planCatalog.js) never needs a
// schema migration — it just needs a value on whichever plans define it.
const planSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, default: 0 },
    billingCycle: { type: String, enum: BILLING_CYCLES, default: "monthly" },
    currency: { type: String, default: "USD" },
    // Per-plan trial length; null falls back to the global TRIAL_DAYS env var.
    trialDays: { type: Number, default: null },
    stripePriceId: { type: String, default: null },
    isPublic: { type: Boolean, default: true }, // false hides internal plans (e.g. "trial") from the pricing page
    // Distinct from isPublic: false blocks *new* assignment of this plan
    // (self-serve checkout or admin override) without affecting anyone
    // already subscribed to it.
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    limits: { type: Map, of: Number, default: defaultLimitsMap },
    features: { type: Map, of: Boolean, default: defaultFeaturesMap },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);
