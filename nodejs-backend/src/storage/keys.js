const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

// What each upload is for, and who may see it. Private files are only served
// through short-lived signed URLs; public ones through stable URLs.
const FILE_KINDS = {
  equipment: "public",
  logo: "public",
  qr_code: "public",
  customer_photo: "private",
  customer_doc: "private",
  receipt: "private",
  damage: "private",
  attachment: "private",
};

const KEY_PATTERN = /^(t\/[a-f\d]{24}\/[a-z_]+\/[a-zA-Z0-9-]+(\.thumb)?\.webp|legacy\/[a-zA-Z0-9._-]+)$/;

function isValidKey(key) {
  return typeof key === "string" && key.length <= 200 && KEY_PATTERN.test(key) && !key.includes("..");
}

function newImageKey(accountId, kind) {
  return `t/${accountId}/${kind}/${uuidv4()}.webp`;
}

function thumbKeyFor(key) {
  return key.startsWith("t/") && !key.endsWith(".thumb.webp") ? key.replace(/\.webp$/, ".thumb.webp") : null;
}

function parseKey(key) {
  if (key.startsWith("legacy/")) return { legacy: true, accountId: null, kind: null };
  const [, accountId, kind] = key.split("/");
  return { legacy: false, accountId, kind };
}

// Files uploaded before the storage layer existed (one flat folder that also
// holds customer ID documents) are treated as private.
function visibilityOf(key) {
  const { legacy, kind } = parseKey(key);
  if (legacy) return "private";
  return FILE_KINDS[kind] || "private";
}

function contentTypeOf(key) {
  const ext = key.split(".").pop().toLowerCase();
  return (
    { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif" }[ext] ||
    "application/octet-stream"
  );
}

function sign(secret, key, exp) {
  return crypto.createHmac("sha256", secret).update(`${key}:${exp}`).digest("base64url");
}

function verifySignature(secret, key, exp, sig) {
  if (!exp || !sig || Number(exp) * 1000 < Date.now()) return false;
  const expected = Buffer.from(sign(secret, key, exp));
  const given = Buffer.from(String(sig));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

module.exports = {
  FILE_KINDS,
  isValidKey,
  newImageKey,
  thumbKeyFor,
  parseKey,
  visibilityOf,
  contentTypeOf,
  sign,
  verifySignature,
};
