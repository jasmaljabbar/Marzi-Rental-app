const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { tenantGuard } = require("./plugins/tenantGuard");

const { ObjectId } = mongoose.Schema.Types;

// Fields every tenant-owned, shop-scoped document carries. accountId is the
// isolation boundary between businesses; shopId is the branch inside one.
function tenantFields() {
  return {
    accountId: { type: ObjectId, ref: "Account", required: true },
    shopId: { type: ObjectId, ref: "Shop", required: true },
  };
}

function syncIdField() {
  return { syncId: { type: String, default: uuidv4, unique: true } };
}

function archiveFields() {
  return {
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  };
}

function applyTenantGuard(schema) {
  schema.plugin(tenantGuard);
  return schema;
}

module.exports = { ObjectId, tenantFields, syncIdField, archiveFields, applyTenantGuard };
