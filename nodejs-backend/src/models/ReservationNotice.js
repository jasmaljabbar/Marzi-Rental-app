const mongoose = require("mongoose");
const { ObjectId, tenantFields, syncIdField, applyTenantGuard } = require("./common");

// "Your reserved item was moved to another customer's order." Polled by the
// affected user's client; there is no realtime transport.
const reservationNoticeSchema = new mongoose.Schema(
  {
    ...syncIdField(),
    ...tenantFields(),
    forUserId: { type: ObjectId, ref: "User", default: null },
    forUsername: { type: String, required: true },
    message: { type: String, required: true, maxlength: 500 },
    customerName: { type: String, default: null },
    equipmentName: { type: String, default: null },
  },
  { timestamps: true }
);

reservationNoticeSchema.index({ accountId: 1, forUserId: 1, createdAt: -1 });
reservationNoticeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 3 });

applyTenantGuard(reservationNoticeSchema);

module.exports = mongoose.model("ReservationNotice", reservationNoticeSchema);
