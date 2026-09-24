const mongoose = require("mongoose");
const { tenantFields, syncIdField, archiveFields, applyTenantGuard } = require("./common");

const categorySchema = new mongoose.Schema(
  {
    ...syncIdField(),
    ...tenantFields(),
    name: { type: String, required: true, trim: true, maxlength: 80 },
    // Lower-cased, whitespace-collapsed name — enforces case-insensitive uniqueness.
    nameKey: { type: String, required: true },
    // One of config/categoryIcons.js keys, or null for the default icon.
    icon: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    ...archiveFields(),
  },
  { timestamps: true }
);

categorySchema.index(
  { accountId: 1, shopId: 1, nameKey: 1 },
  { unique: true, partialFilterExpression: { isArchived: false } }
);
categorySchema.index({ accountId: 1, shopId: 1, isArchived: 1, sortOrder: 1 });

applyTenantGuard(categorySchema);

module.exports = mongoose.model("Category", categorySchema);
