const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const BACKEND_ROOT = path.join(__dirname, "../..");

// Files on a local directory. In production that directory must be a
// persistent volume shared by every API instance (see docs/DEPLOYMENT.md).
function createLocalDriver({ rootDir, legacyDir }) {
  const root = path.resolve(BACKEND_ROOT, rootDir);
  const legacyRoot = path.resolve(BACKEND_ROOT, legacyDir);

  function pathFor(key) {
    const base = key.startsWith("legacy/") ? legacyRoot : root;
    const relative = key.startsWith("legacy/") ? key.slice("legacy/".length) : key;
    const full = path.resolve(base, relative);
    if (!full.startsWith(base + path.sep)) throw new Error("Invalid storage key");
    return full;
  }

  return {
    name: "local",
    async put(key, buffer) {
      const target = pathFor(key);
      await fsp.mkdir(path.dirname(target), { recursive: true });
      const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
      await fsp.writeFile(tmp, buffer);
      await fsp.rename(tmp, target);
    },
    async getBuffer(key) {
      try {
        return await fsp.readFile(pathFor(key));
      } catch (err) {
        if (err.code === "ENOENT") return null;
        throw err;
      }
    },
    async getStream(key) {
      const target = pathFor(key);
      try {
        const stat = await fsp.stat(target);
        return { stream: fs.createReadStream(target), size: stat.size };
      } catch (err) {
        if (err.code === "ENOENT") return null;
        throw err;
      }
    },
    async delete(key) {
      await fsp.rm(pathFor(key), { force: true });
    },
  };
}

module.exports = { createLocalDriver };
