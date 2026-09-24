const { getEnv } = require("../config/env");
const { badRequest } = require("../lib/errors");
const FileObject = require("../models/FileObject");
const { createLocalDriver } = require("./localDriver");
const { createS3Driver } = require("./s3Driver");
const { processImage, toPngDataUri } = require("./imageProcessor");
const { checkDeclaredImage, assertImageLimit, MAX_EQUIPMENT_IMAGES } = require("./uploadRules");
const {
  FILE_KINDS,
  isValidKey,
  newImageKey,
  thumbKeyFor,
  parseKey,
  visibilityOf,
  contentTypeOf,
  sign,
  verifySignature,
} = require("./keys");

// Central file handling. The database only ever stores storage *keys*; URLs
// are built per response, so they always match the host, scheme and driver
// the client is actually using (the root cause of the old broken images).
let driver;

function getDriver() {
  if (driver) return driver;
  const env = getEnv();
  driver =
    env.STORAGE_DRIVER === "s3"
      ? createS3Driver({
          bucket: env.S3_BUCKET,
          region: env.S3_REGION,
          endpoint: env.S3_ENDPOINT,
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
          forcePathStyle: env.S3_FORCE_PATH_STYLE,
        })
      : createLocalDriver({ rootDir: env.STORAGE_LOCAL_DIR, legacyDir: env.LEGACY_UPLOADS_DIR });
  return driver;
}

// Tests swap in an in-memory or mocked driver.
function setDriver(custom) {
  driver = custom;
}

const PRIVATE_URL_TTL_SECONDS = 60 * 60;
const PRIVATE_URL_BUCKET_SECONDS = 30 * 60;

// Expiry is rounded up to a 30-minute boundary so the same file gets the same
// URL for a while, keeping browser/image caches effective.
function privateExpiry(now = Date.now()) {
  const target = Math.floor(now / 1000) + PRIVATE_URL_TTL_SECONDS;
  return Math.ceil(target / PRIVATE_URL_BUCKET_SECONDS) * PRIVATE_URL_BUCKET_SECONDS;
}

function encodeKey(key) {
  return key.split("/").map(encodeURIComponent).join("/");
}

// Turns whatever is stored on a document (a key, or an absolute URL saved by
// older versions of the API) into a storage key. Returns null when the value
// is not one of ours.
function extractKey(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (isValidKey(trimmed)) return trimmed;
  let pathname;
  try {
    pathname = new URL(trimmed, "http://placeholder.local").pathname;
  } catch {
    return null;
  }
  const decoded = decodeURIComponent(pathname);
  const filesAt = decoded.indexOf("/files/");
  if (filesAt !== -1) {
    const key = decoded.slice(filesAt + "/files/".length);
    return isValidKey(key) ? key : null;
  }
  const legacyAt = decoded.indexOf("/static/uploads/");
  if (legacyAt !== -1) {
    const key = `legacy/${decoded.slice(legacyAt + "/static/uploads/".length)}`;
    return isValidKey(key) ? key : null;
  }
  const env = getEnv();
  if (env.S3_PUBLIC_BASE_URL && trimmed.startsWith(env.S3_PUBLIC_BASE_URL)) {
    const key = trimmed.slice(env.S3_PUBLIC_BASE_URL.replace(/\/$/, "").length + 1).split("?")[0];
    return isValidKey(key) ? key : null;
  }
  return null;
}

function requestBaseUrl(req) {
  const env = getEnv();
  if (env.PUBLIC_API_URL) return env.PUBLIC_API_URL.replace(/\/$/, "");
  if (!req) return "";
  return `${req.protocol}://${req.get("host")}`;
}

// Builds the URL resolver used by DTO mappers for one request.
function createUrlResolver(req) {
  const env = getEnv();
  const base = requestBaseUrl(req);

  function urlForKey(key) {
    if (visibilityOf(key) === "public") {
      if (env.STORAGE_DRIVER === "s3" && env.S3_PUBLIC_BASE_URL) {
        return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${encodeKey(key)}`;
      }
      return `${base}/files/${encodeKey(key)}`;
    }
    const exp = privateExpiry();
    return `${base}/files/${encodeKey(key)}?exp=${exp}&sig=${sign(env.fileSigningSecret, key, exp)}`;
  }

  function url(value) {
    if (!value) return null;
    const key = extractKey(value);
    if (key) return urlForKey(key);
    // Unknown external URL stored by an old client: pass through only http(s).
    return /^https?:\/\//i.test(value) ? value : null;
  }

  function thumb(value) {
    if (!value) return null;
    const key = extractKey(value);
    const t = key ? thumbKeyFor(key) : null;
    return t ? urlForKey(t) : url(value);
  }

  return { url, thumb, urls: (values = []) => values.map(url).filter(Boolean), thumbs: (values = []) => values.map(thumb).filter(Boolean) };
}

// Validates a file reference sent by a client and returns the key to store.
// Accepts a key or any URL this API produced. New files must have been
// uploaded by the same business with an allowed kind; legacy files are only
// accepted when the document already referenced them.
async function normalizeFileRef(value, { req, kinds, existing = [] }) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const key = extractKey(value);
  if (!key) {
    // An external URL saved by an old client stays valid on the record that
    // already has it, so editing that record doesn't fail.
    if (existing.includes(value)) return value;
    throw badRequest("Unsupported file reference. Upload the image through /upload first.", "INVALID_FILE_REF");
  }

  const existingKeys = new Set(existing.map(extractKey).filter(Boolean));
  if (existingKeys.has(key)) return key;

  const { legacy, accountId, kind } = parseKey(key);
  const tenantAccountId = String(req.tenant.accountId);
  if (legacy || accountId !== tenantAccountId || (kinds && !kinds.includes(kind))) {
    throw badRequest("Unsupported file reference. Upload the image through /upload first.", "INVALID_FILE_REF");
  }
  const registered = await FileObject.exists({ accountId: req.tenant.accountId, key });
  if (!registered) throw badRequest("File not found. Upload it again.", "INVALID_FILE_REF");
  return key;
}

// Same for a list; a file listed twice is kept once.
async function normalizeFileRefs(values, options) {
  if (values === undefined) return undefined;
  if (values === null) return [];
  const keys = [];
  for (const value of values) {
    const key = await normalizeFileRef(value, options);
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

async function uploadImage({ buffer, kind, accountId, userId }) {
  if (!FILE_KINDS[kind]) throw badRequest(`Unknown upload kind "${kind}".`, "VALIDATION_ERROR");
  const processed = await processImage(buffer);
  const key = newImageKey(accountId, kind);
  const thumbKey = thumbKeyFor(key);
  const store = getDriver();
  await store.put(key, processed.full, "image/webp");
  await store.put(thumbKey, processed.thumb, "image/webp");
  await FileObject.create({
    accountId,
    key,
    kind,
    visibility: FILE_KINDS[kind],
    contentType: "image/webp",
    size: processed.full.length,
    width: processed.width,
    height: processed.height,
    thumbKey,
    createdBy: userId || null,
  });
  return { key, thumbKey };
}

async function readAsPngDataUri(value) {
  const key = extractKey(value);
  if (!key) return null;
  try {
    const buffer = await getDriver().getBuffer(key);
    return buffer ? await toPngDataUri(buffer) : null;
  } catch {
    return null;
  }
}

module.exports = {
  getDriver,
  setDriver,
  extractKey,
  createUrlResolver,
  normalizeFileRef,
  normalizeFileRefs,
  uploadImage,
  readAsPngDataUri,
  isValidKey,
  visibilityOf,
  contentTypeOf,
  verifySignature,
  checkDeclaredImage,
  assertImageLimit,
  MAX_EQUIPMENT_IMAGES,
  FILE_KINDS,
};
