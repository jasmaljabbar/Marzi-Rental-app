const pino = require("pino");
const { getEnv } = require("../config/env");

let logger;

function getLogger() {
  if (logger) return logger;
  const env = getEnv();
  logger = pino({
    level: env.LOG_LEVEL || (env.isTest ? "silent" : env.isProduction ? "info" : "debug"),
    base: { service: "rental-api" },
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "*.password",
        "*.new_password",
        "*.current_password",
        "*.token",
        "*.hashedPassword",
      ],
      censor: "[redacted]",
    },
  });
  return logger;
}

module.exports = { getLogger };
