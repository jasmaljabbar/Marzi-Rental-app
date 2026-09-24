const { badRequest } = require("../lib/errors");
const { HEIC_MESSAGE } = require("./imageProcessor");

// Upload rules enforced by the API. The web and mobile apps mirror them for
// early feedback (web-dashboard/src/utils/image.ts and
// flutter-app/lib/core/media.dart), but only these checks are trusted.
// The byte limit is UPLOAD_MAX_BYTES (env), applied by multer on /upload.

// Photos per equipment item.
const MAX_EQUIPMENT_IMAGES = 4;

const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// Some tools send no type or a generic one. Decoding the file (imageProcessor)
// decides for those, as it does for every upload.
const GENERIC_MIME_TYPES = ["", "application/octet-stream"];

function extensionOf(filename) {
  const name = String(filename || "");
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

// Rejects files whose declared type or extension is not an accepted image,
// before any decoding. It is only a first filter: a renamed file still has to
// decode as a real image afterwards.
function checkDeclaredImage({ originalname, mimetype }) {
  const type = String(mimetype || "").toLowerCase().split(";")[0].trim();
  const ext = extensionOf(originalname);
  if (/^image\/hei[cf]/.test(type) || ext === "heic" || ext === "heif") {
    throw badRequest(HEIC_MESSAGE, "UNSUPPORTED_IMAGE");
  }
  if ((!ACCEPTED_MIME_TYPES.includes(type) && !GENERIC_MIME_TYPES.includes(type)) || (ext && !ACCEPTED_EXTENSIONS.includes(ext))) {
    throw badRequest("Only JPEG, PNG, WebP or GIF images can be uploaded.", "UNSUPPORTED_IMAGE");
  }
}

// Enforces the photo limit on a record's final list of storage keys. Items
// saved before the limit existed may hold more photos: they keep them and can
// remove some, but cannot add new ones until they are under the limit.
function assertImageLimit(keys, existingKeys = [], max = MAX_EQUIPMENT_IMAGES) {
  if (keys.length <= max) return;
  const existing = new Set(existingKeys);
  const added = keys.filter((k) => !existing.has(k)).length;
  if (added === 0) return;
  const kept = keys.length - added;
  const room = Math.max(max - kept, 0);
  throw badRequest(
    room === 0
      ? `An item can have at most ${max} photos. Remove a photo before adding another.`
      : `An item can have at most ${max} photos. You can add ${room} more.`,
    "TOO_MANY_IMAGES",
    { max_images: max }
  );
}

module.exports = {
  MAX_EQUIPMENT_IMAGES,
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  checkDeclaredImage,
  assertImageLimit,
};
