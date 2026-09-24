const path = require("node:path");
const { readdirSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const coverage = process.argv.includes("--coverage");
const files = readdirSync(path.join(root, "tests")).filter((f) => f.endsWith(".test.js")).map((f) => `tests/${f}`);
const args = ["--test", "--test-concurrency=1"];
if (coverage) args.push("--experimental-test-coverage", "--test-coverage-include=src/**");
const result = spawnSync(process.execPath, [...args, ...files], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "test", MONGOMS_DOWNLOAD_DIR: process.env.MONGOMS_DOWNLOAD_DIR || path.join(root, "node_modules/.cache/mongodb-binaries") },
});
if (result.error) throw result.error;
process.exit(result.status || (result.signal ? 1 : 0));
