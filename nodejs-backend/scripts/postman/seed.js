// Explicit, non-destructive creation of demo data in the configured .env DB.
// No collection drops, database clears or existing-user password changes.
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");
const { bootstrap, readEnvironment, writeEnvironment, environmentFile } = require("./bootstrap");
const { execute } = require("./run");
async function main() {
  const connectDB = require("../../src/config/db");
  process.env.LOG_LEVEL = "silent";
  await connectDB();
  require("../../src/models/loadAll");
  const { runMigrations } = require("../../src/migrations");
  const migrations = await runMigrations({ apply: true, log: () => {} });
  if (migrations.some((m) => m.status === "needs-attention")) throw new Error("Database migrations need attention before seeding.");
  for (const name of mongoose.modelNames()) await mongoose.model(name).init();
  const values = await bootstrap(readEnvironment(environmentFile));
  writeEnvironment(environmentFile, values);
  const { createApp } = require("../../src/app");
  await execute(createApp(), values, { label: "database", onState: (state) => writeEnvironment(environmentFile, state) });
  console.log("Demo users and objects created. Import .postman/Marzi-Local.postman_environment.json for credentials and IDs.");
}
if (require.main === module) main().catch((err) => { console.error(err.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { main };
