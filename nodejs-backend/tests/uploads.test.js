const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const h = require("./helpers");

function binary(req) {
  return req.buffer(true).parse((res, cb) => {
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => cb(null, Buffer.concat(chunks)));
  });
}

function pathOf(url) {
  const u = new URL(url);
  return `${u.pathname}${u.search}`;
}

describe("image storage (P1-3)", () => {
  let app;
  let owner;
  before(async () => {
    await h.startDb();
    app = h.buildApp();
  });
  after(h.stopDb);
  beforeEach(async () => {
    await h.resetDb();
    await h.seedPlans();
    owner = await h.registerBusiness(app);
  });

  async function upload(client, kind, buffer, filename = "photo.png") {
    return client.post(`/upload?kind=${kind}`).attach("file", buffer, { filename, contentType: "image/png" });
  }

  it("re-encodes uploads to WebP and returns a key plus URLs built for the caller's host", async () => {
    const res = await upload(owner, "equipment", await h.pngBuffer("#ff0000", 40));
    assert.equal(res.status, 201);
    assert.match(res.body.key, /^t\/[a-f\d]{24}\/equipment\/[\w-]+\.webp$/);
    const url = new URL(res.body.url);
    assert.equal(url.pathname, `/files/${res.body.key}`);
    assert.ok(res.body.thumb_url.includes(".thumb.webp"));

    const file = await binary(h.request(app).get(url.pathname));
    assert.equal(file.status, 200);
    assert.equal(file.headers["content-type"], "image/webp");
    assert.equal(file.body.subarray(8, 12).toString(), "WEBP");
  });

  it("serves private files only through a valid signed link", async () => {
    const res = await upload(owner, "customer_doc", await h.pngBuffer());
    const signed = pathOf(res.body.url);
    assert.match(signed, /\?exp=\d+&sig=/);
    assert.equal((await h.request(app).get(signed)).status, 200);
    assert.equal((await h.request(app).get(`/files/${res.body.key}`)).status, 403, "unsigned");
    assert.equal((await h.request(app).get(signed.replace(/sig=[^&]+/, "sig=forged"))).status, 403, "tampered");
    const expired = signed.replace(/exp=\d+/, `exp=${Math.floor(Date.now() / 1000) - 10}`);
    assert.equal((await h.request(app).get(expired)).status, 403, "expired");
  });

  it("rejects SVG and non-image files whatever their declared type", async () => {
    const svg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");
    const a = await owner.post("/upload?kind=equipment").attach("file", svg, { filename: "x.svg", contentType: "image/svg+xml" });
    assert.equal(a.status, 400);
    assert.equal(a.body.code, "UNSUPPORTED_IMAGE");
    const b = await owner.post("/upload?kind=equipment").attach("file", Buffer.from("MZ not an image"), { filename: "x.png", contentType: "image/png" });
    assert.equal(b.status, 400);
  });

  it("explains HEIC uploads instead of storing an unreadable file", async () => {
    const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypheic"), Buffer.alloc(32)]);
    const res = await owner.post("/upload?kind=equipment").attach("file", heic, { filename: "IMG_1.HEIC", contentType: "image/heic" });
    assert.equal(res.status, 400);
    assert.match(res.body.detail, /HEIC/);
  });

  it("stores keys, not URLs, and resolves them per request", async () => {
    const photo = await upload(owner, "equipment", await h.pngBuffer());
    const cat = await owner.post("/categories").send({ name: "Tools" });
    const eq = await owner.post("/equipment").send({ name: "Drill", rent_per_day: 10, category_id: cat.body.id, images: [photo.body.url] });
    assert.equal(eq.status, 201);
    const Equipment = require("../src/models/Equipment");
    const stored = await Equipment.findById(eq.body.id).setOptions({ skipTenantCheck: true }).lean();
    assert.deepEqual(stored.images, [photo.body.key]);

    const viaProxy = await owner.get(`/equipment/${eq.body.id}`).set("Host", "api.example.com").set("X-Forwarded-Proto", "https");
    assert.ok(viaProxy.body.images[0].startsWith("http://api.example.com/files/"), "host follows the request");
    assert.equal(viaProxy.body.image_thumbs.length, 1);

    // Re-sending the resolved URLs on edit keeps the same keys.
    const edit = await owner.put(`/equipment/${eq.body.id}`).send({ images: eq.body.images });
    assert.equal(edit.status, 200);
  });

  it("uses PUBLIC_API_URL and trusted proxy headers when configured", async () => {
    const proxied = h.buildApp({ TRUST_PROXY: "1" });
    const res = await h
      .request(proxied)
      .post("/upload?kind=equipment")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Forwarded-Proto", "https")
      .attach("file", await h.pngBuffer(), { filename: "a.png", contentType: "image/png" });
    assert.ok(res.body.url.startsWith("https://"), "https behind a TLS proxy (mixed-content fix)");

    const fixed = h.buildApp({ PUBLIC_API_URL: "https://api.rentals.example" });
    const res2 = await h
      .request(fixed)
      .post("/upload?kind=equipment")
      .set("Authorization", `Bearer ${owner.token}`)
      .attach("file", await h.pngBuffer(), { filename: "a.png", contentType: "image/png" });
    assert.ok(res2.body.url.startsWith("https://api.rentals.example/files/"));
    h.buildApp({ TRUST_PROXY: "0", PUBLIC_API_URL: "" });
  });

  it("refuses file references from another business or unknown URLs", async () => {
    const other = await h.registerBusiness(app);
    const theirs = await upload(other, "customer_photo", await h.pngBuffer());
    const stolen = await owner.post("/customers").send({ name: "X", phone: "5550001", photo_url: theirs.body.url });
    assert.equal(stolen.status, 400);
    assert.equal(stolen.body.code, "INVALID_FILE_REF");
    const external = await owner.post("/customers").send({ name: "X", phone: "5550002", photo_url: "https://evil.example/pixel.png" });
    assert.equal(external.status, 400);
    const wrongKind = await upload(owner, "equipment", await h.pngBuffer());
    const misuse = await owner.post("/customers").send({ name: "X", phone: "5550003", doc_url: wrongKind.body.key });
    assert.equal(misuse.status, 400, "an equipment photo can't be filed as a private ID document");
  });

  it("serves files saved by the old API (absolute URLs) through signed links", async () => {
    fs.writeFileSync(path.join(process.env.LEGACY_UPLOADS_DIR, "legacy-photo.jpg"), await require("sharp")({ create: { width: 2, height: 2, channels: 3, background: "#000" } }).jpeg().toBuffer());
    const customer = await h.createCustomer(owner);
    const Customer = require("../src/models/Customer");
    await Customer.updateOne(
      { _id: customer.id },
      { $set: { photoUrl: "http://10.0.2.2:5000/static/uploads/legacy-photo.jpg" } }
    ).setOptions({ skipTenantCheck: true });

    const dto = (await owner.get("/customers")).body[0];
    assert.match(dto.photo_url, /\/files\/legacy\/legacy-photo\.jpg\?exp=/);
    const file = await h.request(app).get(pathOf(dto.photo_url));
    assert.equal(file.status, 200);
    assert.equal(file.headers["content-type"], "image/jpeg");

    // Editing the customer and sending the resolved URL back keeps the legacy file.
    const edit = await owner.put(`/customers/${customer.id}`).send({ name: "Renamed", photo_url: dto.photo_url });
    assert.equal(edit.status, 200);
    assert.equal((await owner.get("/static/uploads/legacy-photo.jpg")).status, 404, "the old public folder is no longer served");
  });

  it("rejects oversized uploads", async () => {
    const small = h.buildApp({ UPLOAD_MAX_BYTES: "100" });
    const res = await h
      .request(small)
      .post("/upload?kind=equipment")
      .set("Authorization", `Bearer ${owner.token}`)
      .attach("file", await h.pngBuffer("#123456", 200), { filename: "big.png", contentType: "image/png" });
    assert.equal(res.status, 413);
    h.buildApp({ UPLOAD_MAX_BYTES: String(10 * 1024 * 1024) });
  });

  it("works with the S3 driver", async () => {
    const storage = require("../src/storage");
    const { createS3Driver } = require("../src/storage/s3Driver");
    const objects = new Map();
    const fake = {
      async send(cmd) {
        const { Key, Body } = cmd.input;
        const name = cmd.constructor.name;
        if (name === "PutObjectCommand") objects.set(Key, Body);
        if (name === "GetObjectCommand") {
          if (!objects.has(Key)) throw Object.assign(new Error("missing"), { name: "NoSuchKey" });
          const body = objects.get(Key);
          return { Body: { transformToByteArray: async () => body, pipe: (res) => res.end(body), on: () => {} }, ContentLength: body.length };
        }
        if (name === "DeleteObjectCommand") objects.delete(Key);
        return {};
      },
    };
    storage.setDriver(createS3Driver({ bucket: "b", client: fake }));
    try {
      const res = await upload(owner, "logo", await h.pngBuffer());
      assert.equal(res.status, 201);
      assert.ok(objects.has(res.body.key));
      assert.ok(objects.has(res.body.key.replace(".webp", ".thumb.webp")));
      assert.ok(await storage.readAsPngDataUri(res.body.key), "PDF logo can be read back from S3");
    } finally {
      storage.setDriver(null);
    }
  });
});
