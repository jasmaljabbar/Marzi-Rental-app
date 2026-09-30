const mongoose = require("mongoose");
const { ObjectId, applyTenantGuard } = require("./common");

// Registry of uploaded files. A document may only reference a storage key
// that its own business uploaded, which stops one tenant attaching (and then
// reading through signed URLs) another tenant's files.
const fileObjectSchema = new mongoose.Schema(
  {
    accountId: { type: ObjectId, ref: "Account", required: true },
    key: { type: String, required: true, unique: true },
    kind: { type: String, required: true },
    visibility: { type: String, enum: ["public", "private"], required: true },
    contentType: { type: String, required: true },
    size: { type: Number, default: 0 },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    thumbKey: { type: String, default: null },
    storageDriver: { type: String, enum: ["local", "s3", "imagekit"], default: null },
    providerFileId: { type: String, default: null },
    providerThumbFileId: { type: String, default: null },
    createdBy: { type: ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

fileObjectSchema.index({ accountId: 1, key: 1 });

applyTenantGuard(fileObjectSchema);

module.exports = mongoose.model("FileObject", fileObjectSchema);
