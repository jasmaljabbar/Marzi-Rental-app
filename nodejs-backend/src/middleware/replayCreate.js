const { syncFields } = require('../lib/sync');
const { conflict } = require('../lib/errors');
const { asyncHandler } = require('../lib/http');
const { createUrlResolver } = require('../storage');

// Validated create retries use the record's unique syncId. A lost response
// cannot create a second record. Scope the lookup to the authenticated shop.
function replayCreate(model, dto) {
  return asyncHandler(async (req, res, next) => {
    const fields = syncFields(req);
    if (!fields.syncId) return next();
    const existing = await model.findOne({ accountId: req.tenant.accountId, shopId: req.tenant.shopId, syncId: fields.syncId }).lean();
    if (!existing) return next();
    if (existing.syncPayloadHash !== fields.syncPayloadHash) throw conflict('This pending operation was already saved with different values. Refresh the record before editing.', 'SYNC_CONFLICT');
    return res.status(201).json(dto(existing, createUrlResolver(req)));
  });
}
module.exports = { replayCreate };
