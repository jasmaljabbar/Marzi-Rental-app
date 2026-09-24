const mongoose = require("mongoose");
const { notFound } = require("./errors");

// All tenant data access goes through these helpers so the account (business)
// and shop (branch) filters can't be forgotten. req.tenant is set by the
// requireTenant middleware and is the only source of scope.
function tenantOf(req) {
  const tenant = req.tenant;
  if (!tenant || !tenant.accountId || !tenant.shopId) {
    throw new Error("Tenant scope missing: route is not behind requireTenant");
  }
  return tenant;
}

// Documents in the active shop (list queries, creates).
function shopFilter(req, extra = {}) {
  const t = tenantOf(req);
  return { accountId: t.accountId, shopId: t.shopId, ...extra };
}

// Documents in any shop this user may access (fetch/mutate by id).
function accessibleFilter(req, extra = {}) {
  const t = tenantOf(req);
  return { accountId: t.accountId, shopId: { $in: t.shopIds }, ...extra };
}

// Account-wide documents (settings, users).
function accountFilter(req, extra = {}) {
  const t = tenantOf(req);
  return { accountId: t.accountId, ...extra };
}

// Fields stamped on every new tenant document.
function createScope(req) {
  const t = tenantOf(req);
  return { accountId: t.accountId, shopId: t.shopId };
}

function isValidId(id) {
  return typeof id === "string" ? /^[a-f\d]{24}$/i.test(id) : mongoose.isValidObjectId(id);
}

// Loads one document the caller may access, or throws 404. A document that
// exists in another business reads as "not found", never "forbidden", so ids
// can't be probed across tenants.
async function findOwned(Model, id, req, { label = "Record", select, session, lean = false, activeShopOnly = false } = {}) {
  if (!isValidId(id)) throw notFound(`${label} not found.`);
  const filter = activeShopOnly ? shopFilter(req, { _id: id }) : accessibleFilter(req, { _id: id });
  let query = Model.findOne(filter);
  if (select) query = query.select(select);
  if (session) query = query.session(session);
  if (lean) query = query.lean();
  const doc = await query;
  if (!doc) throw notFound(`${label} not found.`);
  return doc;
}

module.exports = { tenantOf, shopFilter, accessibleFilter, accountFilter, createScope, findOwned, isValidId };
