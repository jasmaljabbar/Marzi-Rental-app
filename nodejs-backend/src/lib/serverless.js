const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { getEnv } = require("../config/env");
const { pendingMigrations } = require("../migrations");
const { getLogger } = require("./logger");

// No database connection or listener during module import/build. Concurrent
// cold-start requests share initialization; warm requests reuse the app/pool.
function createServerlessHandler(createApp) {
  let app;
  let initializing;
  let migrationsChecked = false;

  async function ready() {
    if (app && mongoose.connection.readyState === 1) return app;
    if (!initializing) {
      initializing = (async () => {
        const env = getEnv();
        await connectDB();
        if (!migrationsChecked) {
          const pending = await pendingMigrations();
          if (pending.length) {
            const message = `Pending data migrations: ${pending.join(", ")}. Run "npm run migrate -- --apply" before redeploying.`;
            if (env.requireMigrations) {
              const err = new Error(message);
              err.code = "MIGRATIONS_PENDING";
              throw err;
            }
            getLogger().warn(message);
          }
          migrationsChecked = true;
        }
        app ||= createApp();
        return app;
      })().finally(() => { initializing = null; });
    }
    return initializing;
  }

  return async function handler(req, res) {
    let application;
    try {
      application = await ready();
    } catch (err) {
      // Keep startup failures actionable in Vercel logs without exposing
      // connection strings, configuration or credentials to HTTP clients.
      try { getLogger().error({ err }, "API initialization failed"); }
      catch { console.error("API initialization failed: invalid environment configuration"); }
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Retry-After", "5");
      return res.end(JSON.stringify({ detail: "API is temporarily unavailable. Please try again shortly.", code: "STARTUP_FAILED" }));
    }
    return application(req, res);
  };
}

module.exports = { createServerlessHandler };
