const InventoryTransaction = require("../models/InventoryTransaction");
const Equipment = require("../models/Equipment");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_YEAR = 365;
const DEFAULT_USEFUL_LIFE_YEARS = 5;

const ACQUISITION_TYPES = ["INITIAL_STOCK", "STOCK_IN"];
const RETIREMENT_TYPES = ["SCRAP", "SALE"];

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Replays an equipment's inventory transactions in order and turns them into FIFO
// acquisition lots: each lot is a batch of units bought together (same date, same
// unit cost). Retirement transactions (scrap/sale) consume units from the oldest
// surviving lots first and stamp them with a retiredAt date, so those units stop
// accruing depreciation from that point on.
function buildLots(transactions) {
  const lots = [];
  const sorted = [...transactions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  for (const txn of sorted) {
    if (ACQUISITION_TYPES.includes(txn.transactionType)) {
      if (txn.quantity > 0) {
        lots.push({ quantity: txn.quantity, unitPrice: txn.unitPrice || 0, acquiredAt: txn.createdAt, retiredAt: null });
      }
      continue;
    }
    if (!RETIREMENT_TYPES.includes(txn.transactionType)) continue;

    let remaining = txn.quantity;
    for (const lot of lots) {
      if (remaining <= 0) break;
      if (lot.retiredAt || lot.quantity <= 0) continue;

      if (lot.quantity <= remaining) {
        remaining -= lot.quantity;
        lot.retiredAt = txn.createdAt;
      } else {
        lot.quantity -= remaining;
        lots.push({ quantity: remaining, unitPrice: lot.unitPrice, acquiredAt: lot.acquiredAt, retiredAt: txn.createdAt });
        remaining = 0;
      }
    }
  }

  return lots;
}

function overlapDays(periodStart, periodEnd, rangeStart, rangeEnd) {
  const start = Math.max(periodStart.getTime(), rangeStart.getTime());
  const end = Math.min(periodEnd.getTime(), rangeEnd.getTime());
  return end > start ? (end - start) / MS_PER_DAY : 0;
}

// Straight-line depreciation for one lot, prorated to whatever slice of time
// [rangeStart, rangeEnd) the caller asks for — a day, a month, a year, anything.
// A unit depreciates from its acquisition date until it is either fully written
// down (acquiredAt + usefulLifeYears) or retired, whichever comes first.
function lotDepreciationInRange(lot, usefulLifeYears, rangeStart, rangeEnd) {
  const lifeDays = usefulLifeYears * DAYS_PER_YEAR;
  if (lifeDays <= 0 || lot.unitPrice <= 0 || lot.quantity <= 0) return 0;

  const acquiredAt = new Date(lot.acquiredAt);
  const fullyDepreciatedAt = new Date(acquiredAt.getTime() + lifeDays * MS_PER_DAY);
  const depreciationEnd = lot.retiredAt
    ? new Date(Math.min(new Date(lot.retiredAt).getTime(), fullyDepreciatedAt.getTime()))
    : fullyDepreciatedAt;

  const days = overlapDays(acquiredAt, depreciationEnd, rangeStart, rangeEnd);
  if (days <= 0) return 0;

  const dailyRatePerUnit = lot.unitPrice / lifeDays;
  return dailyRatePerUnit * lot.quantity * days;
}

// Computes straight-line depreciation expense for [start, end), optionally scoped to
// one piece of equipment. Callers pass whatever range they need — a single day, a
// calendar month, a full year — and each lot's expense is prorated by day-overlap,
// so daily/monthly/yearly figures are all derived the same, consistent way.
async function computeDepreciationExpense({ start, end, equipmentId, accountId, shopId } = {}) {
  if (!start || !end) throw new Error("computeDepreciationExpense requires start and end");
  if (!accountId) throw new Error("computeDepreciationExpense requires accountId");
  const rangeStart = new Date(start);
  const rangeEnd = new Date(end);

  const equipmentFilter = { accountId, ...(equipmentId ? { _id: equipmentId } : {}), ...(shopId ? { shopId } : {}) };
  const equipmentList = await Equipment.find(equipmentFilter).select("usefulLifeYears name").lean();
  if (!equipmentList.length) return { total: 0, byEquipment: [] };

  const transactions = await InventoryTransaction.find({ accountId, equipmentId: { $in: equipmentList.map((e) => e._id) } })
    .select("equipmentId transactionType quantity unitPrice createdAt")
    .lean();

  const transactionsByEquipment = new Map();
  transactions.forEach((txn) => {
    const key = String(txn.equipmentId);
    if (!transactionsByEquipment.has(key)) transactionsByEquipment.set(key, []);
    transactionsByEquipment.get(key).push(txn);
  });

  const byEquipment = equipmentList
    .map((equipment) => {
      const lots = buildLots(transactionsByEquipment.get(String(equipment._id)) || []);
      const usefulLifeYears = equipment.usefulLifeYears || DEFAULT_USEFUL_LIFE_YEARS;
      const amount = lots.reduce((sum, lot) => sum + lotDepreciationInRange(lot, usefulLifeYears, rangeStart, rangeEnd), 0);
      return { equipment_id: equipment._id, equipment_name: equipment.name, depreciation: round2(amount) };
    })
    .filter((row) => row.depreciation > 0);

  const total = round2(byEquipment.reduce((sum, row) => sum + row.depreciation, 0));
  return { total, byEquipment };
}

module.exports = { computeDepreciationExpense, DEFAULT_USEFUL_LIFE_YEARS };
