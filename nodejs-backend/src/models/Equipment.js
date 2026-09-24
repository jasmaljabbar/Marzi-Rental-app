const mongoose = require("mongoose");
const { ObjectId, tenantFields, syncIdField, archiveFields, applyTenantGuard } = require("./common");

const equipmentSchema = new mongoose.Schema(
  {
    ...syncIdField(),
    ...tenantFields(),
    name: { type: String, required: true, trim: true, maxlength: 120 },
    nameKey: { type: String, required: true },
    description: { type: String, default: null, maxlength: 2000 },
    // Units physically on hand (rented-out units are subtracted).
    stockCount: { type: Number, default: 0, min: 0 },
    // Subset of stockCount that needs repair and can't be rented.
    damagedCount: { type: Number, default: 0, min: 0 },
    rentPerDay: { type: Number, required: true, default: 0, min: 0 },
    // Suggested security deposit; pre-fills the advance on new rentals.
    depositAmount: { type: Number, default: 0, min: 0 },
    purchasePricePerUnit: { type: Number, default: 0, min: 0 },
    usefulLifeYears: { type: Number, default: 5, min: 0 },
    // Storage keys (legacy documents may still hold absolute URLs).
    images: { type: [String], default: [] },
    categoryId: { type: ObjectId, ref: "Category", required: true },
    ...archiveFields(),
  },
  { timestamps: true }
);

equipmentSchema.index(
  { accountId: 1, shopId: 1, nameKey: 1 },
  { unique: true, partialFilterExpression: { isArchived: false } }
);
equipmentSchema.index({ accountId: 1, shopId: 1, isArchived: 1, name: 1 });
equipmentSchema.index({ accountId: 1, categoryId: 1 });

applyTenantGuard(equipmentSchema);

module.exports = mongoose.model("Equipment", equipmentSchema);
