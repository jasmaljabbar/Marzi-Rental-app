// Stamps accountId on every tenant-owned document (derived from its shop), so
// isolation can be enforced on the business. MaintenanceLog never had a
// tenant key; it inherits both ids from its equipment.
const SHOP_SCOPED = [
  "categories",
  "equipment",
  "customers",
  "rentals",
  "expenses",
  "recurringexpensetemplates",
  "inventorytransactions",
  "equipmentsales",
  "reservations",
  "reservationnotices",
];

module.exports = {
  name: "001-tenant-account-ids",
  required: true,
  async up({ db, dryRun, log }) {
    const summary = { stamped: {}, unscoped: {}, legacyUsers: 0 };
    const shops = await db.collection("shops").find({}, { projection: { accountId: 1 } }).toArray();
    const missing = { $or: [{ accountId: { $exists: false } }, { accountId: null }] };

    for (const name of SHOP_SCOPED) {
      const col = db.collection(name);
      summary.unscoped[name] = await col.countDocuments({ ...missing, shopId: null });
      let stamped = 0;
      for (const shop of shops) {
        const filter = { ...missing, shopId: shop._id };
        if (dryRun) stamped += await col.countDocuments(filter);
        else stamped += (await col.updateMany(filter, { $set: { accountId: shop.accountId } })).modifiedCount;
      }
      summary.stamped[name] = stamped;
    }

    const logs = db.collection("maintenancelogs");
    const equipmentIds = await logs.distinct("equipmentId", missing);
    let logsStamped = 0;
    for (const equipmentId of equipmentIds) {
      const equipment = await db.collection("equipment").findOne({ _id: equipmentId }, { projection: { accountId: 1, shopId: 1 } });
      const shop = equipment && shops.find((s) => String(s._id) === String(equipment.shopId));
      if (!shop) continue;
      const filter = { ...missing, equipmentId };
      if (dryRun) logsStamped += await logs.countDocuments(filter);
      else logsStamped += (await logs.updateMany(filter, { $set: { accountId: shop.accountId, shopId: shop._id } })).modifiedCount;
    }
    summary.stamped.maintenancelogs = logsStamped;

    summary.legacyUsers = await db.collection("users").countDocuments({ accountId: null, isPlatformAdmin: { $ne: true } });
    const unscopedTotal = Object.values(summary.unscoped).reduce((s, n) => s + n, 0);
    if (unscopedTotal > 0 || summary.legacyUsers > 0) {
      log(
        `  ! ${unscopedTotal} record(s) and ${summary.legacyUsers} user(s) belong to no business (pre-SaaS data). ` +
          'Run "npm run migrate:tenant -- \\"Company Name\\"" first to wrap them into a business, then re-run.'
      );
      summary.ok = false;
    }
    return summary;
  },
};
