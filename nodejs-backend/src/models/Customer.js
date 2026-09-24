const mongoose = require("mongoose");
const { tenantFields, syncIdField, archiveFields, applyTenantGuard } = require("./common");

const customerSchema = new mongoose.Schema(
  {
    ...syncIdField(),
    ...tenantFields(),
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    // Digits-only form used for duplicate detection (see lib/text.normalizePhone).
    phoneNormalized: { type: String, required: true },
    address: { type: String, default: null, maxlength: 500 },
    // Storage keys. The ID document is private and only served via signed URL.
    docUrl: { type: String, default: null },
    photoUrl: { type: String, default: null },
    ...archiveFields(),
  },
  { timestamps: true }
);

// A phone number is unique per shop among active customers (docs/DECISIONS.md D6).
customerSchema.index(
  { accountId: 1, shopId: 1, phoneNormalized: 1 },
  { unique: true, partialFilterExpression: { isArchived: false } }
);
customerSchema.index({ accountId: 1, shopId: 1, isArchived: 1, name: 1 });

applyTenantGuard(customerSchema);

module.exports = mongoose.model("Customer", customerSchema);
