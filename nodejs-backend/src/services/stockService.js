const Equipment = require("../models/Equipment");
const { accessibleFilter } = require("../lib/tenantScope");
const { badRequest, notFound } = require("../lib/errors");

// Every stock change is a single conditional atomic update, so two concurrent
// requests can never both take the last unit (the old read-modify-write lost
// updates and oversold). Callers pass the transaction session when the stock
// change must commit together with other writes.

async function explainFailure(req, equipmentId, session, message) {
  const current = await Equipment.findOne(accessibleFilter(req, { _id: equipmentId }))
    .select("name stockCount damagedCount isArchived")
    .session(session || null)
    .lean();
  if (!current) return notFound("Equipment not found.");
  if (current.isArchived) return badRequest(`${current.name} is archived and can't be rented.`, "EQUIPMENT_ARCHIVED");
  const available = Math.max(current.stockCount - (current.damagedCount || 0), 0);
  return badRequest(message(current, available), "INSUFFICIENT_STOCK", { available, equipment_id: current._id });
}

// Takes rentable (non-damaged) units out of stock for a rental.
async function takeForRental(req, equipmentId, quantity, session) {
  const updated = await Equipment.findOneAndUpdate(
    accessibleFilter(req, {
      _id: equipmentId,
      isArchived: { $ne: true },
      $expr: { $gte: [{ $subtract: ["$stockCount", { $ifNull: ["$damagedCount", 0] }] }, quantity] },
    }),
    { $inc: { stockCount: -quantity } },
    { new: true, session }
  );
  if (!updated) {
    throw await explainFailure(req, equipmentId, session, (e, available) => `Insufficient stock for ${e.name}. Available: ${available}.`);
  }
  return updated;
}

// Puts units back (rental returned or cancelled); `damaged` of them come back broken.
async function returnFromRental(req, equipmentId, quantity, { damaged = 0, session } = {}) {
  return Equipment.findOneAndUpdate(
    accessibleFilter(req, { _id: equipmentId }),
    { $inc: { stockCount: quantity, damagedCount: Math.min(damaged, quantity) } },
    { new: true, session }
  );
}

async function addStock(req, equipmentId, quantity, session) {
  const updated = await Equipment.findOneAndUpdate(
    accessibleFilter(req, { _id: equipmentId }),
    { $inc: { stockCount: quantity } },
    { new: true, session }
  );
  if (!updated) throw notFound("Equipment not found.");
  return updated;
}

// Removes units permanently (scrap or sale). Damaged units may be removed too;
// the damaged count is clamped so it never exceeds what's left on hand.
async function removePermanently(req, equipmentId, quantity, session) {
  const updated = await Equipment.findOneAndUpdate(
    accessibleFilter(req, { _id: equipmentId, stockCount: { $gte: quantity } }),
    [
      { $set: { stockCount: { $subtract: ["$stockCount", quantity] } } },
      { $set: { damagedCount: { $min: [{ $ifNull: ["$damagedCount", 0] }, "$stockCount"] } } },
    ],
    { new: true, session }
  );
  if (!updated) {
    throw await explainFailure(req, equipmentId, session, (e) => `Not enough stock of ${e.name}. On hand: ${e.stockCount}.`);
  }
  return updated;
}

async function markDamaged(req, equipmentId, quantity, session) {
  const updated = await Equipment.findOneAndUpdate(
    accessibleFilter(req, {
      _id: equipmentId,
      $expr: { $gte: [{ $subtract: ["$stockCount", { $ifNull: ["$damagedCount", 0] }] }, quantity] },
    }),
    { $inc: { damagedCount: quantity } },
    { new: true, session }
  );
  if (!updated) {
    throw await explainFailure(req, equipmentId, session, (e, available) =>
      available <= 0 ? "No available (non-damaged) stock to mark as damaged." : `Only ${available} undamaged unit(s) of ${e.name} are in stock.`
    );
  }
  return updated;
}

async function markRepaired(req, equipmentId, quantity, session) {
  const updated = await Equipment.findOneAndUpdate(
    accessibleFilter(req, { _id: equipmentId, damagedCount: { $gte: quantity } }),
    { $inc: { damagedCount: -quantity } },
    { new: true, session }
  );
  if (!updated) {
    const exists = await Equipment.exists(accessibleFilter(req, { _id: equipmentId })).session(session || null);
    if (!exists) throw notFound("Equipment not found.");
    throw badRequest("No damaged units to repair.", "NOTHING_TO_REPAIR");
  }
  return updated;
}

module.exports = { takeForRental, returnFromRental, addStock, removePermanently, markDamaged, markRepaired };
