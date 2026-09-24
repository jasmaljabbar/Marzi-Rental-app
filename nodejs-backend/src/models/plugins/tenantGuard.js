// Defense in depth for multi-tenancy: every query or aggregation on a
// tenant-owned model must filter by accountId. Services build scoped filters
// through lib/tenantScope.js; this plugin turns a forgotten filter into a loud
// error instead of a silent cross-tenant read.
//
// Platform-level code (operator console, migrations, scripts) opts out
// explicitly and greppably with `.setOptions({ skipTenantCheck: true })` on a
// query, or `.option({ skipTenantCheck: true })` on an aggregate.
const QUERY_OPS = [
  "find",
  "findOne",
  "countDocuments",
  "findOneAndUpdate",
  "findOneAndDelete",
  "findOneAndReplace",
  "updateOne",
  "updateMany",
  "deleteOne",
  "deleteMany",
  "replaceOne",
  "distinct",
];

function hasAccountFilter(filter) {
  if (!filter || typeof filter !== "object") return false;
  if (filter.accountId !== undefined && filter.accountId !== null) return true;
  if (Array.isArray(filter.$and)) return filter.$and.some(hasAccountFilter);
  return false;
}

class TenantFilterMissingError extends Error {
  constructor(model, op) {
    super(`Tenant filter (accountId) missing on ${model}.${op}`);
    this.name = "TenantFilterMissingError";
  }
}

function tenantGuard(schema) {
  schema.pre(QUERY_OPS, function guardQuery() {
    if (this.getOptions().skipTenantCheck) return;
    if (!hasAccountFilter(this.getFilter())) {
      throw new TenantFilterMissingError(this.model.modelName, this.op);
    }
  });

  schema.pre("aggregate", function guardAggregate() {
    if (this.options && this.options.skipTenantCheck) return;
    const first = this.pipeline()[0];
    if (!first || !first.$match || !hasAccountFilter(first.$match)) {
      throw new TenantFilterMissingError(this._model ? this._model.modelName : "unknown", "aggregate");
    }
  });
}

module.exports = { tenantGuard, hasAccountFilter, TenantFilterMissingError };
