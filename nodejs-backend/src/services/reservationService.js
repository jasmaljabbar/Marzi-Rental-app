const Reservation = require("../models/Reservation");
const ReservationNotice = require("../models/ReservationNotice");
const Equipment = require("../models/Equipment");
const Customer = require("../models/Customer");
const { shopFilter, createScope, findOwned } = require("../lib/tenantScope");
const { conflict, badRequest, notFound } = require("../lib/errors");

const HOLD_DURATION_MS = 4 * 60 * 60 * 1000;
const nextExpiry = () => new Date(Date.now() + HOLD_DURATION_MS);

function listFilter(req, { customer_id }) {
  return shopFilter(req, { expiresAt: { $gt: new Date() }, ...(customer_id ? { customerId: customer_id } : {}) });
}

// Creates or adjusts a customer draft's hold. Refuses (409) when the quantity
// would exceed what's left after other customers' holds, with enough detail
// for the client to offer a transfer.
async function upsertReservation(req, { customer_id, equipment_id, quantity }) {
  const equipment = await findOwned(Equipment, equipment_id, req, { label: "Equipment", activeShopOnly: true, lean: true });
  const customer = await findOwned(Customer, customer_id, req, { label: "Customer", activeShopOnly: true, select: "_id isArchived", lean: true });
  if (equipment.isArchived) throw badRequest("This equipment is archived. Restore it before reserving.", "EQUIPMENT_ARCHIVED");
  if (customer.isArchived) throw badRequest("This customer is archived. Restore them before reserving.", "CUSTOMER_ARCHIVED");

  const physicallyAvailable = equipment.stockCount - (equipment.damagedCount || 0);
  // TTL cleanup is asynchronous; expired holds must stop blocking stock now.
  const others = await Reservation.find(shopFilter(req, { equipmentId: equipment._id, customerId: { $ne: customer_id }, expiresAt: { $gt: new Date() } }))
    .sort({ quantity: -1 })
    .lean();
  const reservedByOthers = others.reduce((sum, r) => sum + r.quantity, 0);
  const remaining = physicallyAvailable - reservedByOthers;

  if (quantity > remaining) {
    const top = others[0] || null;
    let conflictCustomerName = "another customer";
    if (top) {
      const holder = await Customer.findOne({ _id: top.customerId, accountId: req.tenant.accountId }).select("name").lean();
      conflictCustomerName = holder?.name || conflictCustomerName;
    }
    const availableForYou = Math.max(remaining, 0);
    throw conflict(
      availableForYou <= 0
        ? `${equipment.name} is fully reserved right now.`
        : `Only ${availableForYou} unit(s) of ${equipment.name} are available — the rest are reserved.`,
      "RESERVATION_CONFLICT",
      {
        conflict: top
          ? { reservation_id: top._id, customer_id: top.customerId, customer_name: conflictCustomerName, quantity: top.quantity, held_by: top.createdBy }
          : null,
        available_for_you: availableForYou,
      }
    );
  }

  try {
    return await Reservation.findOneAndUpdate(
      shopFilter(req, { customerId: customer_id, equipmentId: equipment._id }),
      {
        $set: { quantity, createdBy: req.tenant.username, createdByUserId: req.tenant.userId, expiresAt: nextExpiry() },
        $setOnInsert: createScope(req),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  } catch (err) {
    if (err.code === 11000) throw conflict("This item was just reserved by someone else — please try again.", "RESERVATION_RACE");
    throw err;
  }
}

async function removeReservation(req, id) {
  const reservation = await findOwned(Reservation, id, req, { label: "Reservation", select: "_id", lean: true });
  await Reservation.deleteOne({ _id: reservation._id, accountId: req.tenant.accountId });
}

async function clearForCustomer(req, customerId) {
  await Reservation.deleteMany(shopFilter(req, { customerId }));
}

async function transferReservation(req, id, { to_customer_id }) {
  const reservation = await findOwned(Reservation, id, req, { label: "Reservation" });
  if (reservation.expiresAt <= new Date()) throw notFound("Reservation has expired.");
  const toCustomer = await Customer.findOne(shopFilter(req, { _id: to_customer_id, isArchived: { $ne: true } })).select("name").lean();
  if (!toCustomer) throw badRequest("Customer not found.", "INVALID_CUSTOMER");

  const [equipment, fromCustomer] = await Promise.all([
    Equipment.findOne({ _id: reservation.equipmentId, accountId: req.tenant.accountId }).select("name").lean(),
    Customer.findOne({ _id: reservation.customerId, accountId: req.tenant.accountId }).select("name").lean(),
  ]);
  const previousOwnerId = reservation.createdByUserId;
  const previousOwner = reservation.createdBy;

  const existing = await Reservation.findOne({
    accountId: req.tenant.accountId,
    shopId: reservation.shopId,
    customerId: to_customer_id,
    equipmentId: reservation.equipmentId,
  });

  let result;
  if (existing && String(existing._id) !== String(reservation._id)) {
    existing.quantity = (existing.expiresAt > new Date() ? existing.quantity : 0) + reservation.quantity;
    existing.createdBy = req.tenant.username;
    existing.createdByUserId = req.tenant.userId;
    existing.expiresAt = nextExpiry();
    await existing.save();
    await Reservation.deleteOne({ _id: reservation._id, accountId: req.tenant.accountId });
    result = existing;
  } else {
    reservation.customerId = to_customer_id;
    reservation.createdBy = req.tenant.username;
    reservation.createdByUserId = req.tenant.userId;
    reservation.expiresAt = nextExpiry();
    await reservation.save();
    result = reservation;
  }

  const movedByOther = previousOwnerId ? String(previousOwnerId) !== String(req.tenant.userId) : previousOwner !== req.tenant.username;
  if (movedByOther) {
    const customerName = fromCustomer?.name || "a customer";
    const equipmentName = equipment?.name || "An item";
    await ReservationNotice.create({
      accountId: req.tenant.accountId,
      shopId: reservation.shopId,
      forUserId: previousOwnerId || null,
      forUsername: previousOwner,
      message: `${equipmentName} reserved for ${customerName} was moved to ${toCustomer.name}'s order by ${req.tenant.username}.`,
      customerName,
      equipmentName,
    });
  }
  return result.toObject();
}

function noticeFilter(req) {
  return { accountId: req.tenant.accountId, $or: [{ forUserId: req.tenant.userId }, { forUserId: null, forUsername: req.tenant.username }] };
}

async function listNotices(req) {
  return ReservationNotice.find({ ...noticeFilter(req), shopId: { $in: req.tenant.shopIds } }).sort({ createdAt: -1 }).lean();
}

async function ackNotice(req, id) {
  const result = await ReservationNotice.deleteOne({ _id: id, ...noticeFilter(req) });
  if (result.deletedCount === 0) {
    throw notFound("Notice not found.");
  }
}

module.exports = { listFilter, upsertReservation, removeReservation, clearForCustomer, transferReservation, listNotices, ackNotice };
