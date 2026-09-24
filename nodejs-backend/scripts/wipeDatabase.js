// Drops every collection in the configured MongoDB database, then reseeds
// the Plan catalog, rebuilds tenant-scoped indexes, and recreates a super
// admin login, so the app starts from a completely empty state instead of
// requiring collection-by-collection cleanup or leaving signup broken (it
// depends on the "trial" Plan existing) or admin access unrecoverable.
//
// Note: this leaves one User in the database, so the unauthenticated
// "first user in an empty DB" bootstrap on POST /auth/signup no longer
// applies afterward — POST /auth/register (self-serve tenant signup) is
// unaffected, it has no such gate.
//
// Usage:
//   node scripts/wipeDatabase.js
// You'll be asked to type WIPE to confirm before anything is deleted.
require("dotenv").config();
const readline = require("readline");
const { execFileSync } = require("child_process");
const path = require("path");
const mongoose = require("mongoose");

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

async function main() {
  // Guard rail: this script must never be pointed at production data.
  const allowRemote = process.argv.includes("--allow-remote");
  const uri = process.env.MONGODB_URI || "";
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to run with NODE_ENV=production.");
    process.exit(1);
  }
  if (!allowRemote && !/^mongodb:\/\/(localhost|127\.0\.0\.1|mongo)(:|\/)/.test(uri)) {
    console.error("Refusing to wipe a non-local database. Pass --allow-remote only for a disposable dev/test database.");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const dbName = db.databaseName;
  const collections = await db.listCollections().toArray();

  console.log(`Connected to database "${dbName}" on ${mongoose.connection.host}.`);
  if (collections.length === 0) {
    console.log("No collections found — nothing to wipe.");
  } else {
    console.log(`This will permanently delete ${collections.length} collection(s):`);
    for (const c of collections) console.log(`  - ${c.name}`);
  }

  const answer = await ask(`\nType WIPE to permanently delete all data in "${dbName}": `);
  if (answer !== "WIPE") {
    console.log("Aborted — no changes made.");
    await mongoose.disconnect();
    process.exit(1);
  }

  await db.dropDatabase();
  console.log(`Dropped database "${dbName}".`);
  await mongoose.disconnect();

  console.log("\nReseeding plan catalog...");
  execFileSync(process.execPath, [path.join(__dirname, "seedPlans.js")], { stdio: "inherit" });

  console.log("\nApplying data migrations and indexes...");
  execFileSync(process.execPath, [path.join(__dirname, "migrate.js"), "--apply"], { stdio: "inherit" });

  // Recreates platform-admin access, which the wipe above just erased along
  // with everything else — without this step there would be no way back
  // into /platform except the fragile "first user in an empty DB" bootstrap.
  console.log("\nRecreating the super admin login...");
  execFileSync(process.execPath, [path.join(__dirname, "seedSuperAdmin.js")], { stdio: "inherit" });

  console.log(
    '\nDone. Database is empty except for the reseeded plan catalog and a fresh super admin login — ' +
      "see the credentials printed above (or SUPER_ADMIN_USERNAME/SUPER_ADMIN_PASSWORD if you set them). " +
      "Sign up as a new company at /register to start fresh on the tenant side."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
