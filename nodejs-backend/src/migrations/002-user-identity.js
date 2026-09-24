const { slugify } = require("../lib/text");

// Usernames become unique per business (docs/DECISIONS.md D2): drop the old
// platform-wide unique index, give every business a login code, and remove
// the plain-text reset codes of the old reset flow.
module.exports = {
  name: "002-user-identity",
  required: true,
  async up({ db, dryRun }) {
    const summary = { slugsAssigned: 0, droppedIndex: false, resetCodesRemoved: 0 };
    const accounts = db.collection("accounts");
    const without = await accounts.find({ $or: [{ slug: { $exists: false } }, { slug: null }] }).toArray();
    const taken = new Set((await accounts.distinct("slug")).filter(Boolean));
    for (const account of without) {
      const base = slugify(account.companyName) || "business";
      let slug = base;
      for (let n = 2; taken.has(slug); n++) slug = `${base.slice(0, 28)}-${n}`;
      taken.add(slug);
      if (!dryRun) await accounts.updateOne({ _id: account._id }, { $set: { slug } });
      summary.slugsAssigned += 1;
    }

    const users = db.collection("users");
    const indexes = await users.indexes().catch(() => []);
    const legacyIndex = indexes.find((i) => i.unique && JSON.stringify(i.key) === JSON.stringify({ username: 1 }));
    if (legacyIndex) {
      if (!dryRun) await users.dropIndex(legacyIndex.name);
      summary.droppedIndex = true;
    }
    const withCodes = { resetCode: { $exists: true } };
    summary.resetCodesRemoved = dryRun ? await users.countDocuments(withCodes) : (await users.updateMany(withCodes, { $unset: { resetCode: "" } })).modifiedCount;
    return summary;
  },
};
