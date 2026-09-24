const mongoose = require("mongoose");
const { applyTenantGuard } = require("./common");

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 64 },
    value: { type: String, default: null, maxlength: 2000 },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    // Only set for shop-scoped keys (see settingService.SHOP_SCOPED_KEYS).
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", default: null },
  },
  { timestamps: true }
);

settingSchema.index({ accountId: 1, shopId: 1, key: 1 }, { unique: true });

applyTenantGuard(settingSchema);

module.exports = mongoose.model("Setting", settingSchema);
