const mongoose = require("mongoose");

// Builds every index the current schemas define and drops stale ones (for
// example the old platform-wide unique phone/category indexes that made
// different businesses collide).
module.exports = {
  name: "004-sync-indexes",
  required: true,
  async up({ dryRun, log }) {
    require("../models/loadAll");
    const summary = { dropped: {}, failed: {} };
    for (const name of mongoose.modelNames()) {
      const model = mongoose.model(name);
      if (dryRun) {
        const diff = await model.diffIndexes().catch(() => ({ toDrop: [], toCreate: [] }));
        summary.dropped[name] = diff.toDrop;
        continue;
      }
      try {
        summary.dropped[name] = await model.syncIndexes();
      } catch (err) {
        summary.failed[name] = err.message;
        log(`  ! ${name}: ${err.message}`);
      }
    }
    if (Object.keys(summary.failed).length > 0) summary.ok = false;
    return summary;
  },
};
