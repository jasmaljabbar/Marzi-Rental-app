const mongoose = require("mongoose");
const { ObjectId, tenantFields, syncIdField, applyTenantGuard } = require("./common");

// One document per equipment line. Lines created together share an orderId so
// clients can group them and batch returns can be processed as one order.
const rentalSchema = new mongoose.Schema(
  {
    ...syncIdField(),
    ...tenantFields(),
    orderId: { type: String, default: null },
    customerId: { type: ObjectId, ref: "Customer", required: true },
    equipmentId: { type: ObjectId, ref: "Equipment", required: true },
    rentedAt: { type: Date, default: Date.now },
    returnedAt: { type: Date, default: null },
    expectedReturnDate: { type: Date, default: null },
    quantity: { type: Number, default: 1, min: 1 },
    // Daily rate agreed when the rental was created. Null only on rentals
    // created before rates were snapshotted (then the current rate applies).
    dailyRate: { type: Number, default: null, min: 0 },
    advanceAmount: { type: Number, default: 0, min: 0 },
    // Days x rate x quantity, persisted at completion so invoices never drift.
    grossAmount: { type: Number, default: null },
    discountAmount: { type: Number, default: 0, min: 0 },
    lateFeeAmount: { type: Number, default: 0, min: 0 },
    damageAmount: { type: Number, default: 0, min: 0 },
    taxRatePercent: { type: Number, default: 0, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalPrice: { type: Number, default: 0 },
    amountPaidOnReturn: { type: Number, default: 0, min: 0 },
    // Advance in excess of the final total, handed back to the customer.
    refundAmount: { type: Number, default: 0, min: 0 },
    amountDue: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, default: null },
    returnRevenueAmount: { type: Number, default: 0 },
    invoiceNumber: { type: String, default: null },
    paymentStatus: { type: String, enum: ["Pending", "Partial", "Paid"], default: "Pending" },
    status: { type: String, enum: ["Active", "Completed", "Cancelled"], default: "Active" },
    remark: { type: String, default: null, maxlength: 1000 },
    // True when every payment on this rental is recorded in the Payment ledger.
    ledger: { type: Boolean, default: false },
    createdBy: { type: ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

rentalSchema.index({ accountId: 1, shopId: 1, status: 1, rentedAt: -1 });
rentalSchema.index({ accountId: 1, shopId: 1, status: 1, returnedAt: -1 });
rentalSchema.index({ accountId: 1, shopId: 1, customerId: 1, status: 1 });
rentalSchema.index({ accountId: 1, equipmentId: 1, status: 1 });
rentalSchema.index({ accountId: 1, shopId: 1, updatedAt: -1 });
rentalSchema.index({ accountId: 1, orderId: 1 });
rentalSchema.index(
  { accountId: 1, invoiceNumber: 1 },
  { unique: true, partialFilterExpression: { invoiceNumber: { $type: "string" } } }
);

applyTenantGuard(rentalSchema);

module.exports = mongoose.model("Rental", rentalSchema);
