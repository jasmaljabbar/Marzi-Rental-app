const { createHash } = require('node:crypto');

function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical(value[k])]));
  return value;
}
function syncFields(req) {
  if (!req.body.sync_id) return {};
  return { syncId: req.body.sync_id, syncPayloadHash: createHash('sha256').update(JSON.stringify(canonical(req.body))).digest('hex') };
}
module.exports = { syncFields };
