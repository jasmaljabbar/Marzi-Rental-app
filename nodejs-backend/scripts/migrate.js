// Runs the data migrations in src/migrations. Dry run by default: it only
// reports what would change. Nothing is written without --apply.
//
// Usage:
//   npm run migrate                      # dry run
//   npm run migrate -- --apply           # apply required migrations
//   npm run migrate -- --apply --include-optional
//
// Always take a backup (Atlas snapshot or mongodump) before --apply.
require("dotenv").config();
const mongoose = require("mongoose");
const { runMigrations } = require("../src/migrations");

async function main() {
  const apply = process.argv.includes("--apply");
  const includeOptional = process.argv.includes("--include-optional");
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Database: ${mongoose.connection.db.databaseName} on ${mongoose.connection.host}`);
  console.log(apply ? "Mode: APPLY (writes enabled)\n" : "Mode: dry run (no writes). Re-run with --apply to write.\n");
  const results = await runMigrations({ apply, includeOptional });
  console.log("\nResult:");
  for (const r of results) console.log(`  ${r.name}: ${r.status}`);
  await mongoose.disconnect();
  if (results.some((r) => r.status === "needs-attention")) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
