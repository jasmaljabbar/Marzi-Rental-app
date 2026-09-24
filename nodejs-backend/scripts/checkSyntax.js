const { readdirSync } = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
function walk(dir) {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : file.endsWith(".js") ? [file] : [];
  });
}
const files = ["server.js", ...walk("src"), ...walk("scripts"), ...walk("tests")];
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax checked ${files.length} JavaScript files.`);
