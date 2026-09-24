// Optional. Copies the money already recorded on older rentals and sales into
// the Payment ledger, dated when it was received as closely as the old data
// allows (advance on the rental date, the rest on the return date), then marks
// those rentals as ledger-backed. Reports work without it (they fall back to
// the old fields), so it is not required for startup.
module.exports = {
  name: "005-payment-ledger-backfill",
  required: false,
  async up({ db, dryRun }) {
    const rentals = db.collection("rentals");
    const payments = db.collection("payments");
    const summary = { rentals: 0, payments: 0, sales: 0 };
    const cursor = rentals.find({ ledger: { $ne: true }, accountId: { $ne: null } });
    for await (const r of cursor) {
      const rows = [];
      const base = { accountId: r.accountId, shopId: r.shopId, customerId: r.customerId, rentalId: r._id, equipmentId: r.equipmentId, orderId: r.orderId || null, method: "Cash", source: "backfill", createdAt: new Date(), updatedAt: new Date() };
      if (r.advanceAmount > 0) rows.push({ ...base, kind: "advance", amount: r.advanceAmount, receivedAt: r.rentedAt });
      if (r.amountPaidOnReturn > 0) rows.push({ ...base, kind: "return", amount: r.amountPaidOnReturn, receivedAt: r.returnedAt || r.updatedAt || r.rentedAt });
      if (r.refundAmount > 0) rows.push({ ...base, kind: "refund", amount: r.refundAmount, receivedAt: r.returnedAt || r.updatedAt || r.rentedAt });
      summary.rentals += 1;
      summary.payments += rows.length;
      if (!dryRun) {
        if (rows.length) await payments.insertMany(rows);
        await rentals.updateOne({ _id: r._id }, { $set: { ledger: true } });
      }
    }
    const sales = db.collection("equipmentsales").find({ accountId: { $ne: null }, amountPaid: { $gt: 0 } });
    for await (const s of sales) {
      const exists = await payments.countDocuments({ saleId: s._id });
      if (exists) continue;
      summary.sales += 1;
      if (!dryRun) {
        await payments.insertOne({ accountId: s.accountId, shopId: s.shopId, customerId: s.customerId, saleId: s._id, equipmentId: s.equipmentId, kind: "sale", amount: s.amountPaid, method: "Cash", receivedAt: s.soldAt, source: "backfill", createdAt: new Date(), updatedAt: new Date() });
      }
    }
    return summary;
  },
};
