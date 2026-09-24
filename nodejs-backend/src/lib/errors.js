// One error type for every expected failure. The error handler turns it into
// the API's `{ detail, code, ...extra }` response shape; anything that is not an
// AppError is treated as a bug and answered with a generic 500.
class AppError extends Error {
  constructor(status, detail, code, extra = {}) {
    super(detail);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const badRequest = (detail, code = "BAD_REQUEST", extra) => new AppError(400, detail, code, extra);
const unauthorized = (detail = "Not authenticated. Please log in.", code = "UNAUTHENTICATED", extra) =>
  new AppError(401, detail, code, extra);
const paymentRequired = (detail, code, extra) => new AppError(402, detail, code, extra);
const forbidden = (detail = "You do not have permission to perform this action.", code = "FORBIDDEN", extra) =>
  new AppError(403, detail, code, extra);
const notFound = (detail = "Not found.", code = "NOT_FOUND", extra) => new AppError(404, detail, code, extra);
const conflict = (detail, code = "CONFLICT", extra) => new AppError(409, detail, code, extra);
const tooManyRequests = (detail = "Too many requests. Please try again later.", code = "RATE_LIMITED") =>
  new AppError(429, detail, code);
const notImplemented = (detail, code = "NOT_CONFIGURED") => new AppError(501, detail, code);

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  paymentRequired,
  forbidden,
  notFound,
  conflict,
  tooManyRequests,
  notImplemented,
};
