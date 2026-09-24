const { nameKey, normalizePhone } = require("../lib/text");

// Unordered bulk writes: a document that collides with an existing unique
// index entry is skipped (and counted) instead of aborting the migration.
async function write(col, ops) {
  try {
    await col.bulkWrite(ops, { ordered: false });
    return 0;
  } catch (err) {
    const writeErrors = err.writeErrors || err.result?.getWriteErrors?.() || [];
    const duplicates = writeErrors.filter((e) => (e.code ?? e.err?.code) === 11000).length;
    if (duplicates === 0 || duplicates !== writeErrors.length) throw err;
    return duplicates;
  }
}

async function backfill(db, collection, field, compute, dryRun) {
  const col = db.collection(collection);
  const cursor = col.find({ $or: [{ [field]: { $exists: false } }, { [field]: null }] });
  let ops = [];
  let count = 0;
  let conflicts = 0;
  for await (const doc of cursor) {
    count += 1;
    ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { [field]: compute(doc) } } } });
    if (ops.length === 500) {
      if (!dryRun) conflicts += await write(col, ops);
      ops = [];
    }
  }
  if (ops.length && !dryRun) conflicts += await write(col, ops);
  return { count, conflicts };
}

async function duplicates(db, collection, field) {
  return db
    .collection(collection)
    .aggregate([
      { $match: { isArchived: { $ne: true } } },
      { $group: { _id: { accountId: "$accountId", shopId: "$shopId", value: `$${field}` }, count: { $sum: 1 }, ids: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();
}

// Adds the comparison keys behind the new case-insensitive name and
// normalised phone uniqueness, and reports existing duplicates that must be
// merged by hand before the unique indexes can be built.
module.exports = {
  name: "003-normalized-fields",
  required: true,
  async up({ db, dryRun, log }) {
    const summary = {
      phoneNormalized: await backfill(db, "customers", "phoneNormalized", (d) => normalizePhone(d.phone), dryRun),
      categoryNameKey: await backfill(db, "categories", "nameKey", (d) => nameKey(d.name), dryRun),
      equipmentNameKey: await backfill(db, "equipment", "nameKey", (d) => nameKey(d.name), dryRun),
      archivedFlag: 0,
      duplicates: {},
    };
    // Documents missing the flag aren't covered by the partial unique indexes;
    // setting it one by one lets a duplicate be reported instead of aborting.
    for (const name of ["categories", "equipment", "customers", "expenses"]) {
      const result = await backfill(db, name, "isArchived", () => false, dryRun);
      summary.archivedFlag += result.count;
      const key = { customers: "phoneNormalized", categories: "categoryNameKey", equipment: "equipmentNameKey" }[name];
      if (key) summary[key].conflicts += result.conflicts;
    }
    if (!dryRun) {
      // Groups of active records sharing a phone/name within one shop. Any
      // backfill conflict above is one of these groups too.
      summary.duplicates.customers = (await duplicates(db, "customers", "phoneNormalized")).length;
      summary.duplicates.categories = (await duplicates(db, "categories", "nameKey")).length;
      summary.duplicates.equipment = (await duplicates(db, "equipment", "nameKey")).length;
      const total = Object.values(summary.duplicates).reduce((s, n) => s + n, 0);
      if (total > 0) {
        log(`  ! ${total} duplicate group(s) found (same phone or name within one shop). Merge or archive them, then re-run.`);
        summary.ok = false;
      }
    }
    return summary;
  },
};
