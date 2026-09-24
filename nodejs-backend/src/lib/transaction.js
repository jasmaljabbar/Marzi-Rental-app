const mongoose = require("mongoose");
const { getEnv } = require("../config/env");
const { getLogger } = require("./logger");

let supported = null;

// Transactions need a replica set (Atlas always is). A standalone dev mongod
// can't run them, so "auto" mode detects support once and falls back to plain
// writes with a warning rather than failing every request.
async function transactionsSupported() {
  if (supported !== null) return supported;
  const mode = getEnv().MONGO_TRANSACTIONS;
  if (mode === "on") return (supported = true);
  if (mode === "off") return (supported = false);
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    supported = Boolean(hello.setName || hello.msg === "isdbgrid");
  } catch {
    supported = false;
  }
  if (!supported) {
    getLogger().warn("MongoDB transactions unavailable (standalone server); multi-document writes are not atomic");
  }
  return supported;
}

// Runs fn(session) inside a transaction when available, otherwise fn(null).
// fn may be retried on transient errors, so it must only have DB side effects.
async function withTransaction(fn) {
  if (!(await transactionsSupported())) return fn(null);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

function resetTransactionSupportCache() {
  supported = null;
}

module.exports = { withTransaction, transactionsSupported, resetTransactionSupportCache };
