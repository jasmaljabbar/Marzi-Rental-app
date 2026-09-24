const mongoose = require("mongoose");
const { getEnv } = require("./env");
const { getLogger } = require("../lib/logger");

async function connectDB(uri = getEnv().MONGODB_URI) {
  const log = getLogger();
  mongoose.set("strictQuery", true);
  mongoose.connection.on("error", (err) => log.error({ err: err.message }, "MongoDB connection error"));
  mongoose.connection.on("disconnected", () => log.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => log.info("MongoDB reconnected"));
  // In production, indexes are built by the migration runner (npm run migrate),
  // not implicitly at boot, so a large index build or a duplicate-key conflict
  // can't block or crash startup.
  await mongoose.connect(uri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    autoIndex: !getEnv().isProduction,
  });
  log.info("MongoDB connected");
}

module.exports = connectDB;
