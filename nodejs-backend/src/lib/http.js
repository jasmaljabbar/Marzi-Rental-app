// Express 4 does not forward rejected promises to the error handler, so every
// async route handler is wrapped once here instead of repeating try/catch.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Wraps every handler function exported by a controller module.
function wrapController(handlers) {
  return Object.fromEntries(Object.entries(handlers).map(([name, fn]) => [name, asyncHandler(fn)]));
}

module.exports = { asyncHandler, wrapController };
