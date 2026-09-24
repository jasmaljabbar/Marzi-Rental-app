const sharp = require("sharp");
const { badRequest } = require("../lib/errors");

const ACCEPTED_FORMATS = ["jpeg", "png", "webp", "gif", "heif", "tiff"];
const MAX_PIXELS = 40_000_000;
const FULL_SIZE = 1600;
const THUMB_SIZE = 320;
const HEIC_MESSAGE =
  "HEIC photos are not supported. Upload a JPEG, PNG or WebP (on iPhone: Settings > Camera > Formats > Most Compatible).";

function isHeic(buffer) {
  if (buffer.length < 12) return false;
  const brand = buffer.subarray(4, 12).toString("latin1");
  return brand.startsWith("ftyp") && ["heic", "heix", "hevc", "mif1", "msf1"].includes(brand.slice(4));
}

// Validates an upload by decoding it (the declared MIME type and file name are
// ignored), then re-encodes to WebP: auto-rotated, metadata (EXIF/GPS)
// stripped, bounded in size, plus a small thumbnail for lists.
async function processImage(buffer) {
  let meta;
  try {
    meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    if (isHeic(buffer)) {
      throw badRequest(HEIC_MESSAGE, "UNSUPPORTED_IMAGE");
    }
    throw badRequest("The file is not a supported image. Upload a JPEG, PNG or WebP.", "UNSUPPORTED_IMAGE");
  }
  if (!ACCEPTED_FORMATS.includes(meta.format)) {
    throw badRequest(`Image format "${meta.format}" is not supported. Upload a JPEG, PNG or WebP.`, "UNSUPPORTED_IMAGE");
  }

  const source = () => sharp(buffer, { limitInputPixels: MAX_PIXELS, animated: false }).rotate();
  let full;
  let thumb;
  try {
    full = await source()
      .resize({ width: FULL_SIZE, height: FULL_SIZE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    thumb = await source()
      .resize({ width: THUMB_SIZE, height: THUMB_SIZE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
  } catch {
    // The header was readable but the pixel data is not (a truncated or
    // corrupted file): a client error, not a server fault.
    throw badRequest("The image is damaged or incomplete. Try exporting it again.", "UNSUPPORTED_IMAGE");
  }

  return { full: full.data, thumb, width: full.info.width, height: full.info.height };
}

// pdfmake only embeds JPEG/PNG, so stored WebP images are converted for PDFs.
async function toPngDataUri(buffer, maxSize = 256) {
  const png = await sharp(buffer).resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

module.exports = { processImage, toPngDataUri, isHeic, HEIC_MESSAGE };
