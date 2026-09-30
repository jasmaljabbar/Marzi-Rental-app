const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const pinoHttp = require("pino-http");
const mongoose = require("mongoose");

const { getEnv } = require("./config/env");
const { getLogger } = require("./lib/logger");
const { createLimiters } = require("./middleware/rateLimit");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const publicController = require("./controllers/publicController");
const subscriptionController = require("./controllers/subscriptionController");
const authRoutes = require("./routes/auth");
const { uploadRoutes, fileRoutes } = require("./routes/files");

const LOCALHOST_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d{1,5}$/;
const EXPOSED_HEADERS = ["X-Total-Count", "X-Page", "X-Page-Size", "X-Total-Pages", "X-Truncated", "X-Request-Id", "Content-Disposition"];

// Builds the Express app. A factory (instead of a module-level singleton) so
// tests can create apps with different configuration.
function createApp() {
  const env = getEnv();
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger: getLogger(),
      genReqId: (req, res) => {
        const incoming = req.headers["x-request-id"];
        const id = typeof incoming === "string" && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
        res.setHeader("X-Request-Id", id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === "/health" || req.url === "/ready" },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
    })
  );
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(compression());

  // Stripe signs the exact raw bytes, so this must run before express.json().
  app.post("/subscription/webhook", express.raw({ type: "application/json", limit: "1mb" }), subscriptionController.webhook);

  app.use(
    cors({
      origin: (origin, cb) => {
        // Native apps and server-to-server calls send no Origin header.
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        // Outside production, any localhost port is allowed: `flutter run -d chrome`
        // serves the app on a random port each time.
        if (!env.isProduction && LOCALHOST_ORIGIN.test(origin)) return cb(null, true);
        const err = new Error(`CORS: origin ${origin} not allowed`);
        err.code = "CORS_REJECTED";
        cb(err);
      },
      exposedHeaders: EXPOSED_HEADERS,
      maxAge: 600,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.use(mongoSanitize());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/ready", (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready" });
  });

  app.use("/files", fileRoutes());

  const limiters = createLimiters();
  app.use(limiters.api);

  app.get("/plans", publicController.plans);
  app.get("/catalog", publicController.catalog);
  app.use("/auth", authRoutes(limiters));
  app.use("/upload", uploadRoutes(limiters));
  app.use("/account", require("./routes/account"));
  app.use("/shops", require("./routes/shops"));
  app.use("/categories", require("./routes/categories"));
  app.use("/equipment", require("./routes/equipment"));
  app.use("/customers", require("./routes/customers"));
  app.use("/rentals", require("./routes/rentals"));
  app.use("/invoices", require("./routes/invoices"));
  app.use("/reservations", require("./routes/reservations"));
  app.use("/expenses", require("./routes/expenses"));
  app.use("/inventory", require("./routes/inventory"));
  app.use("/settings", require("./routes/settings"));
  app.use("/reports", require("./routes/reports"));
  app.use("/stats", require("./routes/stats"));
  app.use("/subscription", require("./routes/subscription"));
  app.use("/platform", require("./routes/platform"));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// Vercel discovers src/app.js and requires a callable default export. Keep
// createApp available to the local server and isolated test harness as before.
module.exports = require("./lib/serverless").createServerlessHandler(createApp);
module.exports.createApp = createApp;
