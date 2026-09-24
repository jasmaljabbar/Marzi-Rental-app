const mongoose = require("mongoose");
const { ObjectId, tenantFields, syncIdField, applyTenantGuard } = require("./common");

const maintenanceLogSchema = new mongoose.Schema(
  {
    ...syncIdField(),
    ...tenantFields(),
    equipmentId: { type: ObjectId, ref: "Equipment", required: true },
    action: { type: String, required: true, enum: ["Damage", "Repair", "Scrap"] },
    quantity: { type: Number, default: 1, min: 1 },
    remark: { type: String, default: null, maxlength: 1000 },
    cost: { type: Number, default: 0, min: 0 },
    photos: { type: [String], default: [] },
    // Set when damage was reported on a rental return.
    rentalId: { type: ObjectId, ref: "Rental", default: null },
    customerId: { type: ObjectId, ref: "Customer", default: null },
    createdBy: { type: ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

maintenanceLogSchema.index({ accountId: 1, equipmentId: 1, createdAt: -1 });

applyTenantGuard(maintenanceLogSchema);

module.exports = mongoose.model("MaintenanceLog", maintenanceLogSchema);
