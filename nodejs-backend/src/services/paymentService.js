const Payment = require("../models/Payment");
const Counter = require("../models/Counter");
const { round2 } = require("../lib/money");

// Appends one ledger row. Zero amounts are skipped so the ledger only ever
// contains real money movements.
async function record(req, { kind, amount, method, customerId, rentalId, saleId, equipmentId, orderId, note, receivedAt }, session) {
  const value = round2(amount);
  if (value <= 0) return null;
  const [payment] = await Payment.create(
    [
      {
        accountId: req.tenant.accountId,
        shopId: req.tenant.shopId,
        kind,
        amount: value,
        method: method || "Cash",
        receivedAt: receivedAt || new Date(),
        customerId: customerId || null,
        rentalId: rentalId || null,
        saleId: saleId || null,
        equipmentId: equipmentId || null,
        orderId: orderId || null,
        note: note || null,
        createdBy: req.tenant.userId,
      },
    ],
    { session }
  );
  return payment;
}

// Invoice numbers restart every year and are sequential per business.
// Mongo's single-document $inc is atomic; inside a transaction the increment
// rolls back with everything else, so no numbers are burned on failure.
async function nextInvoiceNumber(accountId, forDate = new Date(), session) {
  const year = forDate.getUTCFullYear();
  const scopeKey = `invoice:${accountId}:${year}`;
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { scopeKey },
        { $inc: { seq: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true, session }
      );
      return `INV-${year}-${String(counter.seq).padStart(4, "0")}`;
    } catch (err) {
      lastErr = err;
      if (err.code !== 11000) throw err;
    }
  }
  throw lastErr;
}

module.exports = { record, nextInvoiceNumber };
