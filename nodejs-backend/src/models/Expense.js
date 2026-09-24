const mongoose = require("mongoose");
const { ObjectId, tenantFields, syncIdField, archiveFields, applyTenantGuard } = require("./common");
const { PAYMENT_METHODS } = require("./Payment");

const expenseSchema = new mongoose.Schema(
  {
    ...syncIdField(),
    ...tenantFields(),
    category: { type: String, required: true, trim: true, maxlength: 80 },
    amount: { type: Number, required: true, min: 0 },
    remark: { type: String, default: null, maxlength: 1000 },
    paymentMode: { type: String, enum: PAYMENT_METHODS, default: "Cash" },
    receiptUrl: { type: String, default: null },
    date: { type: Date, default: Date.now },
    equipmentId: { type: ObjectId, ref: "Equipment", default: null },
    // Set when generated from a RecurringExpenseTemplate; periodKey ("YYYY-MM")
    // plus the unique index below guarantee one expense per template per month.
    recurringTemplateId: { type: ObjectId, ref: "RecurringExpenseTemplate", default: null },
    periodKey: { type: String, default: null },
    ...archiveFields(),
  },
  { timestamps: true }
);

expenseSchema.index({ accountId: 1, shopId: 1, isArchived: 1, date: -1 });
expenseSchema.index({ accountId: 1, equipmentId: 1 });
expenseSchema.index(
  { recurringTemplateId: 1, periodKey: 1 },
  { unique: true, partialFilterExpression: { recurringTemplateId: { $type: "objectId" }, periodKey: { $type: "string" } } }
);

applyTenantGuard(expenseSchema);

module.exports = mongoose.model("Expense", expenseSchema);
