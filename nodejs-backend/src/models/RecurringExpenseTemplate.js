const mongoose = require("mongoose");
const { ObjectId, tenantFields, syncIdField, applyTenantGuard } = require("./common");

// Materialised lazily into Expense rows when the expense list is read (there is
// no background worker). dayOfMonth is capped at 28 so it exists in every month.
const recurringExpenseTemplateSchema = new mongoose.Schema(
  {
    ...syncIdField(),
    ...tenantFields(),
    category: { type: String, required: true, trim: true, maxlength: 80 },
    amount: { type: Number, required: true, min: 0 },
    remark: { type: String, default: null, maxlength: 1000 },
    dayOfMonth: { type: Number, required: true, min: 1, max: 28 },
    equipmentId: { type: ObjectId, ref: "Equipment", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

recurringExpenseTemplateSchema.index({ accountId: 1, shopId: 1, isActive: 1 });

applyTenantGuard(recurringExpenseTemplateSchema);

module.exports = mongoose.model("RecurringExpenseTemplate", recurringExpenseTemplateSchema);
