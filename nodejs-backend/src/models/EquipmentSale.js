const mongoose = require("mongoose");
const { ObjectId, tenantFields, syncIdField, applyTenantGuard } = require("./common");

const equipmentSaleSchema = new mongoose.Schema(
  {
    ...syncIdField(),
    ...tenantFields(),
    equipmentId: { type: ObjectId, ref: "Equipment", required: true },
    customerId: { type: ObjectId, ref: "Customer", required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    bookValuePerUnit: { type: Number, default: 0, min: 0 },
    totalBookValue: { type: Number, default: 0, min: 0 },
    gainLoss: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    amountDue: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: ["Pending", "Partial", "Paid"], default: "Pending" },
    soldAt: { type: Date, default: Date.now },
    remark: { type: String, default: null, maxlength: 1000 },
    createdBy: { type: ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

equipmentSaleSchema.index({ accountId: 1, shopId: 1, soldAt: -1 });
equipmentSaleSchema.index({ accountId: 1, customerId: 1 });
equipmentSaleSchema.index({ accountId: 1, equipmentId: 1 });

applyTenantGuard(equipmentSaleSchema);

module.exports = mongoose.model("EquipmentSale", equipmentSaleSchema);
