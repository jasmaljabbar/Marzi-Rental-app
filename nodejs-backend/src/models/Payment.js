const mongoose = require("mongoose");
const { ObjectId, tenantFields, applyTenantGuard } = require("./common");

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer", "Other"];
const PAYMENT_KINDS = ["advance", "return", "due", "sale", "refund"];

// Ledger of money actually received from (or refunded to) customers. Reports
// recognise revenue on receivedAt, so edits to a rental never move revenue
// between periods.
const paymentSchema = new mongoose.Schema(
  {
    ...tenantFields(),
    kind: { type: String, enum: PAYMENT_KINDS, required: true },
    // Always positive; refunds are subtracted by kind.
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: PAYMENT_METHODS, default: "Cash" },
    receivedAt: { type: Date, default: Date.now },
    customerId: { type: ObjectId, ref: "Customer", default: null },
    rentalId: { type: ObjectId, ref: "Rental", default: null },
    saleId: { type: ObjectId, ref: "EquipmentSale", default: null },
    equipmentId: { type: ObjectId, ref: "Equipment", default: null },
    orderId: { type: String, default: null },
    note: { type: String, default: null, maxlength: 500 },
    createdBy: { type: ObjectId, ref: "User", default: null },
    source: { type: String, enum: ["app", "backfill"], default: "app" },
  },
  { timestamps: true }
);

paymentSchema.index({ accountId: 1, shopId: 1, receivedAt: -1 });
paymentSchema.index({ accountId: 1, rentalId: 1 });
paymentSchema.index({ accountId: 1, saleId: 1 });
paymentSchema.index({ accountId: 1, customerId: 1, receivedAt: -1 });

applyTenantGuard(paymentSchema);

module.exports = mongoose.model("Payment", paymentSchema);
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.PAYMENT_KINDS = PAYMENT_KINDS;
