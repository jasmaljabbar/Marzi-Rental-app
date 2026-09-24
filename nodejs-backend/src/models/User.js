const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Unique within a business (accountId), not across the platform — see
    // docs/DECISIONS.md D2. Platform admins have accountId null, so they stay
    // unique among themselves.
    username: { type: String, required: true, trim: true, lowercase: true, maxlength: 64 },
    email: { type: String, trim: true, lowercase: true, default: null, maxlength: 200 },
    hashedPassword: { type: String, required: true },
    role: { type: String, enum: ["owner", "admin", "staff"], default: "staff" },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
    // Staff can be pinned to a single shop; owners/admins see every shop.
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", default: null },
    // Operator of the SaaS platform itself (not a tenant role).
    isPlatformAdmin: { type: Boolean, default: false },
    // Bumped on password change/reset or forced logout; tokens carrying an
    // older value are rejected.
    tokenVersion: { type: Number, default: 0 },
    passwordChangedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    // Password reset: only a SHA-256 hash of the emailed token is stored.
    resetTokenHash: { type: String, default: null, select: false },
    resetTokenExpiresAt: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

userSchema.index({ accountId: 1, username: 1 }, { unique: true });
userSchema.index({ username: 1 });
userSchema.index({ resetTokenHash: 1 }, { partialFilterExpression: { resetTokenHash: { $type: "string" } } });

module.exports = mongoose.model("User", userSchema);
