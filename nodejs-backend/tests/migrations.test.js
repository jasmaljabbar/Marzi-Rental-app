const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const h = require("./helpers");
const { runMigrations, pendingMigrations } = require("../src/migrations");

const { ObjectId } = mongoose.Types;
const quiet = () => {};

describe("data migrations", () => {
  let db;
  before(async () => {
    await h.startDb();
    db = mongoose.connection.db;
  });
  after(h.stopDb);
  beforeEach(h.resetDb);

  async function seedPreHardeningData() {
    const accountId = new ObjectId();
    const shopId = new ObjectId();
    const equipmentId = new ObjectId();
    await db.collection("accounts").insertOne({ _id: accountId, companyName: "Old Timers Ltd", ownerUserId: new ObjectId() });
    await db.collection("shops").insertOne({ _id: shopId, accountId, name: "Main", isActive: true });
    await db.collection("users").insertOne({ username: "owner", hashedPassword: "x", role: "owner", accountId, resetCode: "123456" });
    await db.collection("customers").insertOne({ name: "Legacy", phone: "+91 98765 43210", shopId, syncId: "c1" });
    await db.collection("categories").insertOne({ name: "General", shopId, syncId: "k1" });
    await db.collection("equipment").insertOne({ _id: equipmentId, name: "Old Drill", shopId, stockCount: 1, rentPerDay: 5, categoryId: new ObjectId(), syncId: "e1" });
    await db.collection("maintenancelogs").insertOne({ equipmentId, action: "Damage", syncId: "m1" });
    await db.collection("rentals").insertOne({ customerId: new ObjectId(), equipmentId, shopId, advanceAmount: 10, amountPaidOnReturn: 20, rentedAt: new Date(), returnedAt: new Date(), status: "Completed", syncId: "r1" });
    // The pre-multi-tenancy global unique index that made businesses collide.
    await db.collection("customers").createIndex({ phone: 1 }, { unique: true, name: "phone_1" });
    return { accountId, shopId };
  }

  it("dry run reports without writing", async () => {
    await seedPreHardeningData();
    const results = await runMigrations({ apply: false, log: quiet });
    assert.ok(results.every((r) => ["dry-run", "skipped-optional"].includes(r.status)));
    assert.equal(await db.collection("customers").countDocuments({ accountId: { $exists: true } }), 0);
    assert.equal(await db.collection("migrations").countDocuments(), 0);
  });

  it("upgrades existing data so the new API can serve it", async () => {
    const { accountId, shopId } = await seedPreHardeningData();
    assert.deepEqual(await pendingMigrations(), ["001-tenant-account-ids", "002-user-identity", "003-normalized-fields", "004-sync-indexes"]);
    const results = await runMigrations({ apply: true, includeOptional: true, log: quiet });
    assert.ok(results.every((r) => r.status === "applied"), JSON.stringify(results.map((r) => [r.name, r.status])));
    assert.deepEqual(await pendingMigrations(), []);

    const customer = await db.collection("customers").findOne({});
    assert.equal(String(customer.accountId), String(accountId));
    assert.equal(customer.phoneNormalized, "+919876543210");
    const log = await db.collection("maintenancelogs").findOne({});
    assert.equal(String(log.shopId), String(shopId));
    assert.equal((await db.collection("accounts").findOne({})).slug, "old-timers-ltd");
    assert.equal((await db.collection("users").findOne({})).resetCode, undefined);
    const indexNames = (await db.collection("customers").indexes()).map((i) => i.name);
    assert.ok(!indexNames.includes("phone_1"), "stale global unique index dropped");
    const payments = await db.collection("payments").find({}).toArray();
    assert.deepEqual(payments.map((p) => p.kind).sort(), ["advance", "return"]);

    const again = await runMigrations({ apply: true, includeOptional: true, log: quiet });
    assert.ok(again.every((r) => r.status === "already-applied"), "idempotent");
  });

  it("stops and explains when records belong to no business", async () => {
    await db.collection("customers").insertOne({ name: "Orphan", phone: "1", shopId: null });
    const results = await runMigrations({ apply: true, log: quiet });
    assert.equal(results[0].status, "needs-attention");
    assert.equal(await db.collection("migrations").countDocuments(), 0);
  });

  it("reports duplicate phones that block the new unique index", async () => {
    const { shopId } = await seedPreHardeningData();
    await db.collection("customers").dropIndex("phone_1");
    await db.collection("customers").insertOne({ name: "Twin", phone: "9876543210", shopId, syncId: "c2" });
    // Different formatting, same number: only detectable once normalised.
    await db.collection("customers").updateOne({ syncId: "c2" }, { $set: { phone: "+91-98765-43210" } });
    const results = await runMigrations({ apply: true, log: quiet });
    const normalized = results.find((r) => r.name === "003-normalized-fields");
    assert.equal(normalized.status, "needs-attention");
    assert.equal(normalized.summary.duplicates.customers, 1);
  });
});
