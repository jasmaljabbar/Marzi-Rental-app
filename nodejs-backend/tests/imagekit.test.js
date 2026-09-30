const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { ImageKit } = require("@imagekit/nodejs");
const { createImageKitDriver } = require("../src/storage/imagekitDriver");
const key = "t/0123456789abcdef01234567/customer_doc/demo.webp";
const endpoint = "https://ik.imagekit.io/test";

describe("ImageKit storage", () => {
  it("uploads exact keys as private origin files and returns provider IDs", async () => {
    const calls = [];
    const client = { files: { upload: async (body) => { calls.push(body); return { fileId: "file_1", filePath: `/${key}` }; } } };
    const driver = createImageKitDriver({ urlEndpoint: endpoint, client });
    assert.deepEqual(await driver.put(key, Buffer.from("test")), { fileId: "file_1" });
    assert.equal(calls[0].isPrivateFile, true);
    assert.equal(calls[0].useUniqueFileName, false);
    assert.equal(calls[0].folder, "/t/0123456789abcdef01234567/customer_doc");
    assert.equal(calls[0].fileName, "demo.webp");
    await assert.rejects(driver.put("../invalid", Buffer.from("test")), /Invalid storage key/);
  });

  it("signs origin reads, streams bytes and returns null only for missing files", async () => {
    const client = new ImageKit({ privateKey: "private_test_key", logLevel: "off" });
    const urls = [];
    const driver = createImageKitDriver({ urlEndpoint: endpoint, client, fetchImpl: async (url) => {
      urls.push(new URL(url));
      return new Response(Buffer.from("image bytes"), { headers: { "content-length": "11" } });
    } });
    assert.equal((await driver.getBuffer(key)).toString(), "image bytes");
    const streamed = await driver.getStream(key);
    const chunks = [];
    for await (const chunk of streamed.stream) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString(), "image bytes");
    assert.equal(streamed.size, 11);
    assert.ok(urls.every((url) => url.searchParams.has("ik-s") && url.searchParams.has("ik-t")));
    const missing = createImageKitDriver({ urlEndpoint: endpoint, client, fetchImpl: async () => new Response(null, { status: 404 }) });
    assert.equal(await missing.getStream(key), null);
    const denied = createImageKitDriver({ urlEndpoint: endpoint, client, fetchImpl: async () => new Response("private credential detail", { status: 401 }) });
    await assert.rejects(denied.getBuffer(key), (err) => err.status === 502 && err.code === "STORAGE_UNAVAILABLE" && !err.message.includes("credential"));
  });

  it("deletes by stored provider ID or exact path and ignores missing objects", async () => {
    const deleted = [];
    const client = { files: { delete: async (id) => { deleted.push(id); } }, assets: { list: async () => [{ fileId: "other", filePath: "/another/demo.webp" }, { fileId: "matched", filePath: `/${key}` }] } };
    const driver = createImageKitDriver({ urlEndpoint: endpoint, client });
    await driver.delete(key, { fileId: "known" });
    await driver.delete(key);
    assert.deepEqual(deleted, ["known", "matched"]);
    client.files.delete = async () => { throw { status: 404 }; };
    await driver.delete(key, { fileId: "gone" });
  });

  it("does not expose provider errors or keys in upload failures", async () => {
    const driver = createImageKitDriver({ urlEndpoint: endpoint, client: { files: { upload: async () => { throw new Error("secret upstream credentials"); } } } });
    await assert.rejects(driver.put(key, Buffer.from("test")), (err) => err.status === 502 && err.code === "STORAGE_UNAVAILABLE" && !err.message.includes("secret"));
  });

  it("requires ImageKit configuration whenever that driver is selected", () => {
    const { loadEnv, resetEnv } = require("../src/config/env");
    try {
      assert.throws(() => loadEnv({ MONGODB_URI: "mongodb://test", JWT_SECRET: "test", STORAGE_DRIVER: "imagekit" }), /IMAGEKIT_PRIVATE_KEY/);
      const env = loadEnv({ MONGODB_URI: "mongodb://test", JWT_SECRET: "test", STORAGE_DRIVER: "imagekit", IMAGEKIT_PRIVATE_KEY: "private_test", IMAGEKIT_URL_ENDPOINT: endpoint });
      assert.equal(env.STORAGE_DRIVER, "imagekit");
    } finally { resetEnv(); }
  });
});
