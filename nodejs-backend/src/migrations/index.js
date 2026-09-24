const mongoose = require("mongoose");
const Migration = require("../models/Migration");

// Ordered list of data migrations. Required ones must be applied before the
// API starts in production (server.js checks this).
const MIGRATIONS = [
  require("./001-tenant-account-ids"),
  require("./002-user-identity"),
  require("./003-normalized-fields"),
  require("./004-sync-indexes"),
  require("./005-payment-ledger-backfill"),
];

async function appliedNames() {
  return Migration.distinct("name");
}

async function pendingMigrations() {
  const applied = await appliedNames();
  return MIGRATIONS.filter((m) => m.required && !applied.includes(m.name)).map((m) => m.name);
}

// Runs migrations in order. Dry run (default) only reports what would change.
async function runMigrations({ apply = false, includeOptional = false, log = console.log } = {}) {
  const db = mongoose.connection.db;
  const applied = await appliedNames();
  const results = [];
  for (const migration of MIGRATIONS) {
    if (applied.includes(migration.name)) {
      results.push({ name: migration.name, status: "already-applied" });
      continue;
    }
    if (!migration.required && !includeOptional) {
      results.push({ name: migration.name, status: "skipped-optional" });
      continue;
    }
    log(`${apply ? "Applying" : "Dry run"}: ${migration.name}`);
    const summary = await migration.up({ db, dryRun: !apply, log });
    log(`  ${JSON.stringify(summary)}`);
    const ok = summary?.ok !== false;
    if (apply && ok) await Migration.create({ name: migration.name, summary });
    results.push({ name: migration.name, status: apply ? (ok ? "applied" : "needs-attention") : "dry-run", summary });
    if (apply && !ok) {
      log(`Stopped: ${migration.name} needs attention before later migrations can run.`);
      break;
    }
  }
  return results;
}

module.exports = { MIGRATIONS, pendingMigrations, runMigrations };
