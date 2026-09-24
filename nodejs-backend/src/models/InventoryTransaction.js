const mongoose = require("mongoose");
const { ObjectId, tenantFields, syncIdField, applyTenantGuard } = require("./common");

const inventoryTransactionSchema = new mongoose.Schema(
  {
    ...syncIdField(),
    ...tenantFields(),
    equipmentId: { type: ObjectId, ref: "Equipment", required: true },
    transactionType: {
      type: String,
      required: true,
      enum: ["INITIAL_STOCK", "STOCK_IN", "SCRAP", "SALE"],
      default: "STOCK_IN",
    },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    unitPrice: { type: Number, required: true, default: 0, min: 0 },
    totalCost: { type: Number, default: 0 },
    previousStock: { type: Number, default: 0 },
    newStock: { type: Number, default: 0 },
    note: { type: String, default: null, maxlength: 500 },
    createdBy: { type: ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

inventoryTransactionSchema.index({ accountId: 1, equipmentId: 1, createdAt: 1 });
inventoryTransactionSchema.index({ accountId: 1, shopId: 1, createdAt: -1 });

applyTenantGuard(inventoryTransactionSchema);

module.exports = mongoose.model("InventoryTransaction", inventoryTransactionSchema);
