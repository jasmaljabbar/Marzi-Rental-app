const { asyncHandler } = require('../lib/http');
const { findOwned } = require('../lib/tenantScope');
const { parsePhone } = require('../lib/phone');

// Old clients submit whole records on edit. An exact, unmodified legacy value
// can remain on that record; all new or changed numbers pass strict validation.
function unchangedPhone(model, { company = false } = {}) {
  return asyncHandler(async (req, _res, next) => {
    if (typeof req.body?.phone !== 'string' || parsePhone(req.body.phone)) return next();
    const record = company
      ? await model.findById(req.tenant.accountId).lean()
      : await findOwned(model, req.params.id, req, { lean: true });
    const existing = company ? record?.companyPhone : record?.phone;
    if (existing === req.body.phone) delete req.body.phone;
    next();
  });
}
module.exports = { unchangedPhone };
