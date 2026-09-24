const mongoose = require("mongoose");
const { DEFAULT_CURRENCY } = require("../config/currencies");

// The billing and tenant root: one Account per business. A business owns one
// or more Shops (branches) under a single subscription.
const accountSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true, maxlength: 120 },
    // Short, unique "business code" staff type at login when their username
    // exists in more than one business (see docs/DECISIONS.md D2).
    slug: { type: String, trim: true, lowercase: true, default: undefined },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", default: null },
    stripeCustomerId: { type: String, default: null, index: true },
    // Stored as a storage key (see src/storage), resolved to a URL on output.
    companyLogoUrl: { type: String, default: null },
    companyAddress: { type: String, default: null, maxlength: 500 },
    companyPhone: { type: String, default: null, maxlength: 40 },
    companyEmail: { type: String, default: null, maxlength: 200 },
    taxId: { type: String, default: null, maxlength: 60 },
    invoiceFooterNote: { type: String, default: null, maxlength: 1000 },
    defaultTaxRatePercent: { type: Number, default: 0, min: 0, max: 100 },
    currency: { type: String, default: DEFAULT_CURRENCY },
  },
  { timestamps: true }
);

accountSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { slug: { $type: "string" } } });

module.exports = mongoose.model("Account", accountSchema);
