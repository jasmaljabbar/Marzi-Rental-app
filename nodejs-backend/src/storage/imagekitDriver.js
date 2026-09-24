const { Readable } = require("node:stream");
const { posix: path } = require("node:path");
const { ImageKit, toFile } = require("@imagekit/nodejs");
const { AppError } = require("../lib/errors");
const { isValidKey } = require("./keys");

// Stable storage keys and the existing /files API are preserved. Every origin
// file is private in ImageKit; only the backend generates origin signatures.
function createImageKitDriver({ privateKey, urlEndpoint, client, fetchImpl = fetch }) {
  const imagekit = client || new ImageKit({ privateKey, timeout: 20000, maxRetries: 1, logLevel: "off" });
  const endpoint = urlEndpoint.replace(/\/$/, "");
  function checkKey(key) {
    if (!isValidKey(key)) throw new Error("Invalid storage key");
  }
  function storageError() {
    return new AppError(502, "Image storage is temporarily unavailable. Please try again.", "STORAGE_UNAVAILABLE");
  }
  async function origin(key) {
    checkKey(key);
    const url = imagekit.helper.buildSrc({ urlEndpoint: endpoint, src: `/${key}`, signed: true, expiresIn: 300 });
    let response;
    try { response = await fetchImpl(url, { signal: AbortSignal.timeout(20000), redirect: "error" }); }
    catch { throw storageError(); }
    if (response.status === 404) { await response.body?.cancel(); return null; }
    if (!response.ok) { await response.body?.cancel(); throw storageError(); }
    return response;
  }
  return {
    name: "imagekit",
    async put(key, buffer, contentType = "image/webp") {
      checkKey(key);
      try {
        const result = await imagekit.files.upload({
          file: await toFile(buffer, path.basename(key), { type: contentType }),
          fileName: path.basename(key),
          folder: `/${path.dirname(key)}`,
          useUniqueFileName: false,
          overwriteFile: true,
          isPrivateFile: true,
        });
        if (!result.fileId || result.filePath !== `/${key}`) throw new Error("Unexpected upload path");
        return { fileId: result.fileId };
      } catch { throw storageError(); }
    },
    async getBuffer(key) {
      const response = await origin(key);
      return response ? Buffer.from(await response.arrayBuffer()) : null;
    },
    async getStream(key) {
      const response = await origin(key);
      if (!response) return null;
      // Fetch may decode a compressed response, so don't forward its encoded size.
      const size = response.headers.get("content-encoding") ? undefined : Number(response.headers.get("content-length")) || undefined;
      return { stream: Readable.fromWeb(response.body), size };
    },
    async delete(key, { fileId } = {}) {
      checkKey(key);
      try {
        if (!fileId) {
          const files = await imagekit.assets.list({ path: `/${path.dirname(key)}`, searchQuery: `name = "${path.basename(key)}"`, limit: 100 });
          fileId = files.find((file) => file.filePath === `/${key}`)?.fileId;
        }
        if (fileId) await imagekit.files.delete(fileId);
      } catch (err) {
        if (err.status !== 404) throw storageError();
      }
    },
  };
}

module.exports = { createImageKitDriver };
