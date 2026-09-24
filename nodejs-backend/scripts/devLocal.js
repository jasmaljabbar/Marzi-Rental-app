// One-command local backend for development, with no Docker and no remote
// database: starts a single-node MongoDB replica set whose data lives in
// ./.dev-db (kept between runs), applies the data migrations, seeds the plan
// catalog, then runs the API with auto-reload on http://localhost:5000.
//
//   npm run dev:local            start (Ctrl+C to stop; data is kept)
//   npm run dev:local -- --reset start from an empty database
//
// MONGODB_URI from .env is deliberately ignored here, so development can
// never write to a shared or production database by accident. Everything else
// in .env still applies; with no .env at all, a local-only JWT secret is used.
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const ROOT = path.join(__dirname, "..");
const DB_PATH = path.join(ROOT, ".dev-db");
const MONGO_PORT = Number(process.env.DEV_MONGO_PORT) || 27027;

require("dotenv").config({ path: path.join(ROOT, ".env"), quiet: true });

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, env, stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${args.join(" ")} exited with ${code}`))));
  });
}

async function main() {
  if (process.argv.includes("--reset")) fs.rmSync(DB_PATH, { recursive: true, force: true });
  fs.mkdirSync(DB_PATH, { recursive: true });

  console.log(`Starting local MongoDB on port ${MONGO_PORT} (data in ${path.relative(process.cwd(), DB_PATH) || DB_PATH})...`);
  const replSet = await MongoMemoryReplSet.create({
    replSet: { name: "rs0", count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ port: MONGO_PORT, dbPath: DB_PATH, storageEngine: "wiredTiger" }],
  });
  const uri = replSet.getUri("rental_dev");
  const env = {
    ...process.env,
    NODE_ENV: "development",
    MONGODB_URI: uri,
    REQUIRE_MIGRATIONS: "false",
    JWT_SECRET: process.env.JWT_SECRET || "local-development-only-secret-never-use-in-production",
  };

  await run(process.execPath, ["scripts/migrate.js", "--apply"], env);
  await run(process.execPath, ["scripts/seedPlans.js"], env);

  console.log(`\nLocal database ready: ${uri}`);
  console.log("Create a business from the web app's Sign up page or the mobile app's 'Create a business account'.\n");

  const api = spawn(process.execPath, [require.resolve("nodemon/bin/nodemon.js"), "--ignore", ".dev-db", "server.js"], {
    cwd: ROOT,
    env,
    stdio: "inherit",
  });

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    api.kill("SIGTERM");
    // Ctrl+C in the terminal also signals mongod directly, so the library's
    // graceful shutdown often finds it already gone and logs a harmless
    // connection error with a long stack trace. Hide that noise.
    const warn = console.warn;
    console.warn = () => {};
    // Keep the data files for the next run.
    await replSet.stop({ doCleanup: false }).catch(() => {});
    console.warn = warn;
    console.log("Local API and database stopped. Data is kept in .dev-db (use --reset to start empty).");
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  api.on("exit", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
