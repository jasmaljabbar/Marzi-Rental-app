const rateLimit = require("express-rate-limit");
const { getEnv } = require("../config/env");

// In-process counters. With more than one API instance, plug a shared store
// (e.g. rate-limit-redis) in here — see docs/DEPLOYMENT.md.
function limiter({ windowMs, limit, message, keyGenerator }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator,
    message: { detail: message, code: "RATE_LIMITED" },
  });
}

function createLimiters() {
  const env = getEnv();
  return {
    api: limiter({ windowMs: env.RATE_LIMIT_WINDOW_MS, limit: env.RATE_LIMIT_MAX, message: "Too many requests. Please slow down." }),
    auth: limiter({ windowMs: 15 * 60 * 1000, limit: env.AUTH_RATE_LIMIT_MAX, message: "Too many attempts. Please try again later." }),
    passwordReset: limiter({
      windowMs: 60 * 60 * 1000,
      limit: Math.max(Math.floor(env.AUTH_RATE_LIMIT_MAX / 4), 3),
      message: "Too many password reset attempts. Please try again later.",
    }),
    upload: limiter({ windowMs: 15 * 60 * 1000, limit: 120, message: "Too many uploads. Please try again later." }),
  };
}

module.exports = { createLimiters };
