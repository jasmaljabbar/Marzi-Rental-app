const { AppError } = require("../lib/errors");
const { getEnv } = require("../config/env");
const { getLogger } = require("../lib/logger");

const DUPLICATE_MESSAGES = {
  phoneNormalized: "A customer with this phone number already exists in this shop.",
  username: "That username is already taken in this business.",
  nameKey: "An item with this name already exists in this shop.",
  slug: "That business code is already taken.",
  invoiceNumber: "Invoice number collision. Please retry.",
  key: "A record with that key already exists.",
};

function duplicateMessage(err) {
  const fields = Object.keys(err.keyPattern || err.keyValue || {});
  const known = fields.find((f) => DUPLICATE_MESSAGES[f]);
  return known ? DUPLICATE_MESSAGES[known] : "A record with these details already exists.";
}

function notFoundHandler(_req, res) {
  res.status(404).json({ detail: "Not found", code: "NOT_FOUND" });
}

// Single place that turns errors into the API's { detail, code, ...extra }
// shape. Unexpected errors are logged with the request id and answered with
// a generic message in production so internals never leak.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ detail: err.message, code: err.code, ...err.extra });
  }
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      const maxMb = Math.max(1, Math.floor(getEnv().UPLOAD_MAX_BYTES / (1024 * 1024)));
      return res.status(413).json({ detail: `The image is too large (max ${maxMb} MB).`, code: "FILE_TOO_LARGE" });
    }
    const oneFile = err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE";
    return res.status(400).json({
      detail: oneFile ? "Send one image per request, in a field named 'file'." : err.message,
      code: "UPLOAD_ERROR",
    });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ detail: `Invalid value for ${err.path}.`, code: "INVALID_ID" });
  }
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({ detail: messages.join("; ") || "Invalid data.", code: "VALIDATION_ERROR" });
  }
  if (err.code === 11000) {
    return res.status(409).json({ detail: duplicateMessage(err), code: "DUPLICATE" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ detail: "Malformed JSON body.", code: "BAD_JSON" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ detail: "Request body is too large.", code: "PAYLOAD_TOO_LARGE" });
  }
  if (err.code === "CORS_REJECTED") {
    return res.status(403).json({ detail: err.message, code: "CORS_REJECTED" });
  }

  (req.log || getLogger()).error({ err }, "Unhandled error");
  const env = getEnv();
  res.status(500).json({
    detail: env.isProduction ? "Something went wrong. Please try again." : err.message || "Internal server error",
    code: "INTERNAL_ERROR",
  });
}

module.exports = { errorHandler, notFoundHandler };
