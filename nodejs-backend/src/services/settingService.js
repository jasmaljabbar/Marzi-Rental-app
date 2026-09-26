const Setting = require("../models/Setting");
const { normalizeFileRef } = require("../storage");
const { numeric } = require("../lib/validate");
const { badRequest } = require("../lib/errors");

// Keys whose value can differ per shop; every other key is business-wide.
const SHOP_SCOPED_KEYS = ["qr_code", "low_stock_threshold"];
// Keys whose value is a stored file (resolved to a URL on read).
const FILE_KEYS = { qr_code: ["qr_code"] };

function scopeFor(req, key) {
  return { accountId: req.tenant.accountId, shopId: SHOP_SCOPED_KEYS.includes(key) ? req.tenant.shopId : null };
}

function toDto(setting, files) {
  const value = FILE_KEYS[setting.key] ? files.url(setting.value) : setting.value;
  return { id: setting._id || null, key: setting.key, value: value ?? null };
}

async function listSettings(req) {
  return Setting.find({ accountId: req.tenant.accountId, $or: [{ shopId: null }, { shopId: req.tenant.shopId }] })
    .sort({ key: 1 })
    .lean();
}

async function getSetting(req, key) {
  const setting = await Setting.findOne({ ...scopeFor(req, key), key }).lean();
  return setting || { _id: null, key, value: null };
}

async function getSettingValue(accountId, shopId, key) {
  const setting = await Setting.findOne({
    accountId,
    shopId: SHOP_SCOPED_KEYS.includes(key) ? shopId : null,
    key,
  }).lean();
  return setting ? setting.value : null;
}

async function updateSetting(req, key, rawValue) {
  let value = rawValue === undefined || rawValue === null ? null : String(rawValue);
  if (value !== null && value !== "" && ["max_discount_percent", "low_stock_threshold"].includes(key)) {
    const parsed = numeric.safeParse(rawValue);
    if (!parsed.success || parsed.data < 0 || (key === "max_discount_percent" ? parsed.data > 100 : !Number.isSafeInteger(parsed.data))) {
      throw badRequest(key === "max_discount_percent" ? "Discount must be between 0 and 100." : "Low stock threshold must be a non-negative whole number.", "VALIDATION_ERROR");
    }
    value = String(parsed.data);
  }
  const scope = scopeFor(req, key);
  if (FILE_KEYS[key]) {
    const existing = await Setting.findOne({ ...scope, key }).lean();
    value = await normalizeFileRef(value, { req, kinds: FILE_KEYS[key], existing: existing ? [existing.value] : [] });
  }
  return Setting.findOneAndUpdate({ ...scope, key }, { $set: { value } }, { upsert: true, new: true }).lean();
}

module.exports = { listSettings, getSetting, getSettingValue, updateSetting, toDto, SHOP_SCOPED_KEYS };
