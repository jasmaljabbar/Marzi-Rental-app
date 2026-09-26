const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");

// Customer avatars in lists and multi-photo equipment: what the API returns
// for list screens, the 4-photo limit, upload validation and tenant isolation.

function pathOf(url) {
  const u = new URL(url);
  return `${u.pathname}${u.search}`;
}

describe("profile photos and equipment images", () => {
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

  async function upload(client, kind, { color = "#336699", filename = "photo.png", contentType = "image/png" } = {}) {
    const res = await client.post(`/upload?kind=${kind}`).attach("file", await h.pngBuffer(color, 40), { filename, contentType });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body;
  }

  async function uploadMany(client, count) {
    const shades = ["#aa0000", "#00aa00", "#0000aa", "#aaaa00", "#00aaaa", "#aa00aa"];
    const files = [];
    for (let i = 0; i < count; i++) files.push(await upload(client, "equipment", { color: shades[i % shades.length] }));
    return files;
  }

  async function newCategory(client) {
    return (await client.post("/categories").send({ name: `Cat ${Date.now()}${Math.random()}` })).body.id;
  }

  async function storedImages(id) {
    const Equipment = require("../src/models/Equipment");
    return (await Equipment.findById(id).setOptions({ skipTenantCheck: true }).lean()).images;
  }

  describe("customer photos in lists", () => {
    it("returns a loadable photo and thumbnail in the customer list, and nulls when there is no photo", async () => {
      const photo = await upload(owner, "customer_photo");
      const withPhoto = await owner.post("/customers").send({ name: "Jasmal", phone: "9875550100", photo_url: photo.url });
      assert.equal(withPhoto.status, 201);
      await owner.post("/customers").send({ name: "Noor", phone: "9875550101" });

      const list = (await owner.get("/customers")).body;
      const jasmal = list.find((c) => c.name === "Jasmal");
      const noor = list.find((c) => c.name === "Noor");
      assert.ok(jasmal.photo_url && jasmal.photo_thumb_url, "list rows carry the photo");
      assert.notEqual(jasmal.photo_thumb_url, jasmal.photo_url, "lists get the small thumbnail");
      for (const url of [jasmal.photo_url, jasmal.photo_thumb_url]) {
        const file = await h.request(app).get(pathOf(url));
        assert.equal(file.status, 200, url);
        assert.equal(file.headers["content-type"], "image/webp");
      }
      assert.equal(noor.photo_url, null);
      assert.equal(noor.photo_thumb_url, null);

      // The detail/edit endpoint returns the same file as the list.
      const detail = (await owner.get(`/customers/${jasmal.id}`)).body;
      assert.equal(new URL(detail.photo_url).pathname, new URL(jasmal.photo_url).pathname);
    });

    it("embeds the customer's photo thumbnail in rentals and dashboard alerts", async () => {
      const photo = await upload(owner, "customer_photo");
      const customer = (await owner.post("/customers").send({ name: "Jasmal", phone: "9875550102", photo_url: photo.key })).body;
      const plain = await h.createCustomer(owner);
      const eq = await h.createEquipment(owner, { stock: 5 });
      const rental = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: eq.id })).body;
      assert.ok(rental.customer.photo_thumb_url, "create response");
      await owner.post("/rentals").send({ customer_id: plain.id, equipment_id: eq.id });
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await h.backdateRental(rental.id, 2);
    await owner.put(`/rentals/${rental.id}`).send({ expected_return_date: yesterday });

      const alerts = (await owner.get("/reports/dashboard")).body.alerts;
      const alert = alerts.find((a) => a.rental.customer.name === "Jasmal");
      assert.equal((await h.request(app).get(pathOf(alert.rental.customer.photo_thumb_url))).status, 200);

      const rows = (await owner.get("/rentals")).body;
      assert.ok(rows.find((r) => r.customer.name === "Jasmal").customer.photo_thumb_url);
      assert.equal(rows.find((r) => r.customer.id === plain.id).customer.photo_thumb_url, null);
    });

    it("keeps a customer photo that is private to its business", async () => {
      const photo = await upload(owner, "customer_photo");
      const customer = (await owner.post("/customers").send({ name: "Jasmal", phone: "9875550103", photo_url: photo.key })).body;
      const key = new URL(customer.photo_thumb_url).pathname;
      assert.equal((await h.request(app).get(key)).status, 403, "an unsigned link is refused");

      const other = await h.registerBusiness(app);
      assert.equal((await other.get(`/customers/${customer.id}`)).status, 404);
      const reuse = await other.post("/customers").send({ name: "Copy", phone: "9875550104", photo_url: customer.photo_url });
      assert.equal(reuse.status, 400);
      assert.equal(reuse.body.code, "INVALID_FILE_REF");
    });
  });

  describe("equipment photos (up to 4)", () => {
    it("creates an item with one photo and with four photos uploaded together", async () => {
      const category = await newCategory(owner);
      const [one] = await uploadMany(owner, 1);
      const single = await owner.post("/equipment").send({ name: "Drill", rent_per_day: 10, category_id: category, images: [one.url] });
      assert.equal(single.status, 201);
      assert.equal(single.body.images.length, 1);

      const four = await uploadMany(owner, 4);
      const res = await owner.post("/equipment").send({ name: "Saw", rent_per_day: 10, category_id: category, images: four.map((f) => f.url) });
      assert.equal(res.status, 201);
      assert.equal(res.body.images.length, 4);
      assert.equal(res.body.image_thumbs.length, 4);
      assert.deepEqual(await storedImages(res.body.id), four.map((f) => f.key), "keys stored in the chosen order");

      const reopened = (await owner.get(`/equipment/${res.body.id}`)).body;
      for (const url of reopened.images) assert.equal((await h.request(app).get(new URL(url).pathname)).status, 200);
    });

    it("rejects a fifth photo on create", async () => {
      const category = await newCategory(owner);
      const five = await uploadMany(owner, 5);
      const res = await owner.post("/equipment").send({ name: "Saw", rent_per_day: 10, category_id: category, images: five.map((f) => f.key) });
      assert.equal(res.status, 400);
      assert.equal(res.body.code, "TOO_MANY_IMAGES");
      assert.equal(res.body.max_images, 4);
    });

    it("accepts 2 new photos on an item with 2, and rejects 3 without changing the item", async () => {
      const category = await newCategory(owner);
      const existing = await uploadMany(owner, 2);
      const item = (await owner.post("/equipment").send({ name: "Tent", rent_per_day: 10, category_id: category, images: existing.map((f) => f.key) })).body;

      const three = await uploadMany(owner, 3);
      const tooMany = await owner.put(`/equipment/${item.id}`).send({ images: [...item.images, ...three.map((f) => f.url)] });
      assert.equal(tooMany.status, 400);
      assert.equal(tooMany.body.code, "TOO_MANY_IMAGES");
      assert.match(tooMany.body.detail, /add 2 more/);
      assert.deepEqual(await storedImages(item.id), existing.map((f) => f.key), "nothing saved");

      const ok = await owner.put(`/equipment/${item.id}`).send({ images: [...item.images, three[0].url, three[1].url] });
      assert.equal(ok.status, 200);
      assert.deepEqual(await storedImages(item.id), [...existing.map((f) => f.key), three[0].key, three[1].key]);
    });

    it("keeps existing photos when an edit doesn't touch them", async () => {
      const category = await newCategory(owner);
      const files = await uploadMany(owner, 2);
      const item = (await owner.post("/equipment").send({ name: "Ladder", rent_per_day: 10, category_id: category, images: files.map((f) => f.key) })).body;

      assert.equal((await owner.put(`/equipment/${item.id}`).send({ name: "Tall ladder", rent_per_day: 12 })).status, 200);
      assert.deepEqual(await storedImages(item.id), files.map((f) => f.key), "no images field: unchanged");

      // The web and mobile forms send back the URLs they received.
      assert.equal((await owner.put(`/equipment/${item.id}`).send({ name: "Ladder", images: item.images })).status, 200);
      assert.deepEqual(await storedImages(item.id), files.map((f) => f.key), "resent URLs: same keys");

      const removed = await owner.put(`/equipment/${item.id}`).send({ images: [item.images[1]] });
      assert.equal(removed.status, 200);
      assert.deepEqual(await storedImages(item.id), [files[1].key], "only the removed photo is gone");
    });

    it("stores a photo listed twice only once", async () => {
      const category = await newCategory(owner);
      const [file] = await uploadMany(owner, 1);
      const res = await owner.post("/equipment").send({ name: "Pump", rent_per_day: 10, category_id: category, images: [file.url, file.key] });
      assert.equal(res.status, 201);
      assert.deepEqual(await storedImages(res.body.id), [file.key]);
    });

    it("lets items saved before the limit keep, and remove, their extra photos but not add more", async () => {
      const Equipment = require("../src/models/Equipment");
      const eq = await h.createEquipment(owner);
      const six = await uploadMany(owner, 6);
      const legacyExternal = "https://cdn.example.com/old/pump.jpg";
      const stored = [...six.slice(0, 5).map((f) => f.key), legacyExternal];
      await Equipment.updateOne({ _id: eq.id }, { $set: { images: stored } }).setOptions({ skipTenantCheck: true });

      const loaded = (await owner.get(`/equipment/${eq.id}`)).body;
      assert.equal(loaded.images.length, 6);
      assert.equal(loaded.images[5], legacyExternal, "external URLs saved by old clients pass through");

      const rename = await owner.put(`/equipment/${eq.id}`).send({ name: "Renamed", images: loaded.images });
      assert.equal(rename.status, 200, JSON.stringify(rename.body));
      assert.deepEqual(await storedImages(eq.id), stored);

      const addOne = await owner.put(`/equipment/${eq.id}`).send({ images: [...loaded.images, six[5].key] });
      assert.equal(addOne.status, 400);
      assert.equal(addOne.body.code, "TOO_MANY_IMAGES");

      const fewer = await owner.put(`/equipment/${eq.id}`).send({ images: loaded.images.slice(1) });
      assert.equal(fewer.status, 200);
      assert.equal((await storedImages(eq.id)).length, 5);
    });

    it("refuses another business's photos and edits to another business's item", async () => {
      const other = await h.registerBusiness(app);
      const category = await newCategory(owner);
      const [mine] = await uploadMany(owner, 1);
      const item = (await owner.post("/equipment").send({ name: "Mixer", rent_per_day: 10, category_id: category, images: [mine.key] })).body;

      const otherCategory = await newCategory(other);
      const stolen = await other.post("/equipment").send({ name: "Mixer", rent_per_day: 10, category_id: otherCategory, images: [mine.url] });
      assert.equal(stolen.status, 400);
      assert.equal(stolen.body.code, "INVALID_FILE_REF");

      const [theirs] = await uploadMany(other, 1);
      assert.equal((await other.put(`/equipment/${item.id}`).send({ images: [theirs.key] })).status, 404);
      assert.equal((await owner.put(`/equipment/${item.id}`).send({ images: [mine.key, theirs.key] })).body.code, "INVALID_FILE_REF");
      assert.deepEqual(await storedImages(item.id), [mine.key]);

      // Keys are namespaced by business, so one tenant's upload can never
      // overwrite another's file.
      assert.ok(mine.key.startsWith(`t/${owner.info.account_id}/equipment/`));
      assert.ok(theirs.key.startsWith(`t/${other.info.account_id}/equipment/`));
    });
  });

  describe("upload validation", () => {
    it("rejects files whose declared type or extension is not an image", async () => {
      const png = await h.pngBuffer("#000000", 8);
      const text = await owner.post("/upload?kind=equipment").attach("file", png, { filename: "notes.png", contentType: "text/plain" });
      assert.equal(text.status, 400);
      assert.equal(text.body.code, "UNSUPPORTED_IMAGE");
      const exe = await owner.post("/upload?kind=equipment").attach("file", png, { filename: "setup.exe", contentType: "application/octet-stream" });
      assert.equal(exe.status, 400);
      assert.equal(exe.body.code, "UNSUPPORTED_IMAGE");
      const heic = await owner.post("/upload?kind=equipment").attach("file", png, { filename: "IMG_2.HEIC", contentType: "image/heic" });
      assert.match(heic.body.detail, /HEIC/);
    });

    it("accepts a real image sent with a generic type, as some clients do", async () => {
      const res = await owner.post("/upload?kind=equipment").attach("file", await h.pngBuffer(), { filename: "blob", contentType: "application/octet-stream" });
      assert.equal(res.status, 201);
    });

    it("answers a truncated image with 400, not a server error", async () => {
      const png = await h.pngBuffer("#123456", 200);
      const res = await owner.post("/upload?kind=equipment").attach("file", png.subarray(0, Math.floor(png.length / 2)), { filename: "cut.png", contentType: "image/png" });
      assert.equal(res.status, 400);
      assert.equal(res.body.code, "UNSUPPORTED_IMAGE");
    });

    it("takes one file per request and explains the limit", async () => {
      const png = await h.pngBuffer();
      const res = await owner
        .post("/upload?kind=equipment")
        .attach("file", png, { filename: "a.png", contentType: "image/png" })
        .attach("file", png, { filename: "b.png", contentType: "image/png" });
      assert.equal(res.status, 400);
      assert.equal(res.body.code, "UPLOAD_ERROR");
      assert.match(res.body.detail, /one image per request/);
    });

    it("states the size limit when a file is too large", async () => {
      const small = h.buildApp({ UPLOAD_MAX_BYTES: String(1024 * 1024) });
      const res = await h
        .request(small)
        .post("/upload?kind=equipment")
        .set("Authorization", `Bearer ${owner.token}`)
        .attach("file", Buffer.alloc(1024 * 1024 + 1), { filename: "big.png", contentType: "image/png" });
      assert.equal(res.status, 413);
      assert.match(res.body.detail, /max 1 MB/);
      h.buildApp({ UPLOAD_MAX_BYTES: String(10 * 1024 * 1024) });
    });

    it("requires a login to upload", async () => {
      const res = await h.request(app).post("/upload?kind=equipment").attach("file", await h.pngBuffer(), { filename: "a.png", contentType: "image/png" });
      assert.equal(res.status, 401);
    });
  });
});
