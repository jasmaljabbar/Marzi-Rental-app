// Starts the real API against a throwaway in-memory MongoDB replica set, for
// the web app's Playwright end-to-end tests. Never touches a real database.
//
//   node tests/e2e-server.js          (port from E2E_API_PORT, default 5055)
const os = require("os");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.E2E_API_PORT) || 5055;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rental-e2e-"));
Object.assign(process.env, {
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  JWT_SECRET: "e2e-secret-that-is-long-enough-for-hs256",
  BCRYPT_ROUNDS: "4",
  AUTH_RATE_LIMIT_MAX: "100000",
  RATE_LIMIT_MAX: "100000",
  CORS_ORIGINS: process.env.E2E_WEB_ORIGIN || "http://localhost:5199",
  STORAGE_LOCAL_DIR: path.join(tmp, "storage"),
  LEGACY_UPLOADS_DIR: path.join(tmp, "legacy"),
  MONGODB_URI: "mongodb://placeholder",
});

async function main() {
  const mongoose = require("mongoose");
  const { MongoMemoryReplSet } = require("mongodb-memory-server");
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.MONGODB_URI = replSet.getUri("rental_e2e");
  const { resetEnv } = require("../src/config/env");
  resetEnv();
  await mongoose.connect(process.env.MONGODB_URI);
  require("../src/models/loadAll");
  for (const name of mongoose.modelNames()) await mongoose.model(name).init();

  const Plan = require("../src/models/Plan");
  await Plan.create({
    key: "trial",
    name: "Free Trial",
    price: 0,
    trialDays: 14,
    isPublic: false,
    limits: { maxShops: 2, maxEquipment: 50, maxCustomers: 200, maxStaffUsers: 3, maxActiveRentalsPerMonth: 100 },
    features: { advancedReports: true, analytics: true, maintenance: true, paymentQrCode: true, customBranding: true },
  });

  const { createApp } = require("../src/app");
  const server = createApp().listen(port, () => console.log(`E2E API listening on http://localhost:${port}`));
  const stop = async () => {
    server.close();
    await mongoose.disconnect();
    await replSet.stop();
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
