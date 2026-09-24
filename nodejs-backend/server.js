require("dotenv").config();
const mongoose = require("mongoose");
const { loadEnv } = require("./src/config/env");

let env;
try {
  env = loadEnv();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const { getLogger } = require("./src/lib/logger");
const connectDB = require("./src/config/db");
const { createApp } = require("./src/app");
const { pendingMigrations } = require("./src/migrations");

const log = getLogger();

async function start() {
  if (env.weakJwtSecret) {
    log.warn("JWT_SECRET is shorter than 32 characters. Rotate it before going to production (docs/DEPLOYMENT.md).");
  }
  await connectDB();

  const pending = await pendingMigrations();
  if (pending.length > 0) {
    const message = `Pending data migrations: ${pending.join(", ")}. Run "npm run migrate -- --apply" (see docs/DEPLOYMENT.md).`;
    if (env.requireMigrations) {
      log.fatal(message);
      process.exit(1);
    }
    log.warn(message);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => log.info({ port: env.PORT }, "API listening"));

  const shutdown = (signal) => {
    log.info({ signal }, "Shutting down");
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", (err) => log.error({ err }, "Unhandled promise rejection"));

start().catch((err) => {
  log.fatal({ err }, "Startup failed");
  process.exit(1);
});
