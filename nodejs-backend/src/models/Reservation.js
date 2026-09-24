const mongoose = require("mongoose");
const { ObjectId, tenantFields, syncIdField, applyTenantGuard } = require("./common");

// A provisional hold on equipment units while staff build a customer's order.
// Holds never change Equipment.stockCount; they only stop two drafts claiming
// the same units. Idle holds expire through the TTL index.
const reservationSchema = new mongoose.Schema(
  {
    ...syncIdField(),
    ...tenantFields(),
    customerId: { type: ObjectId, ref: "Customer", required: true },
    equipmentId: { type: ObjectId, ref: "Equipment", required: true },
    quantity: { type: Number, default: 1, min: 1 },
    createdBy: { type: String, required: true },
    createdByUserId: { type: ObjectId, ref: "User", default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

reservationSchema.index({ accountId: 1, shopId: 1, customerId: 1, equipmentId: 1 }, { unique: true });
reservationSchema.index({ accountId: 1, shopId: 1, equipmentId: 1 });
reservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

applyTenantGuard(reservationSchema);

module.exports = mongoose.model("Reservation", reservationSchema);
