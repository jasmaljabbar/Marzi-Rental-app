const mongoose = require("mongoose");
const { applyTenantGuard } = require("./common");

const shopSchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    address: { type: String, default: null, maxlength: 500 },
    phone: { type: String, default: null, maxlength: 40 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

shopSchema.index({ accountId: 1, isActive: 1, createdAt: 1 });

applyTenantGuard(shopSchema);

module.exports = mongoose.model("Shop", shopSchema);
