const { v4: uuidv4 } = require("uuid");
const Rental = require("../models/Rental");
const Equipment = require("../models/Equipment");
const Customer = require("../models/Customer");
const MaintenanceLog = require("../models/MaintenanceLog");
const Payment = require("../models/Payment");
const Reservation = require("../models/Reservation");
const stock = require("./stockService");
const payments = require("./paymentService");
const { getSettingValue } = require("./settingService");
const { shopFilter, accessibleFilter, createScope, findOwned } = require("../lib/tenantScope");
const { withTransaction } = require("../lib/transaction");
const { normalizeFileRefs } = require("../storage");
const { badRequest, notFound } = require("../lib/errors");
const { round2, clamp, splitByWeight, billableDays } = require("../lib/money");
const { containsRegex } = require("../lib/text");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function withParties(query, req) {
  return query
    .populate({ path: "customerId", select: "name phone photoUrl", match: { accountId: req.tenant.accountId } })
    .populate({ path: "equipmentId", select: "name rentPerDay", match: { accountId: req.tenant.accountId } });
}

function dateRange(field, from, to) {
  if (!from && !to) return {};
  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  return { [field]: range };
}

// Free-text search matches customer name/phone, equipment name or invoice number.
async function searchClause(req, search) {
  if (!search) return {};
  const [customers, equipment] = await Promise.all([
    Customer.find(shopFilter(req, { $or: [{ name: containsRegex(search) }, { phone: containsRegex(search) }] })).select("_id").limit(500).lean(),
    Equipment.find(shopFilter(req, { name: containsRegex(search) })).select("_id").limit(500).lean(),
  ]);
  return {
    $or: [
      { customerId: { $in: customers.map((c) => c._id) } },
      { equipmentId: { $in: equipment.map((e) => e._id) } },
      { invoiceNumber: containsRegex(search) },
    ],
  };
}

async function listFilter(req, { status, date_from, date_to, customer_id, order_id, search }) {
  return shopFilter(req, {
    ...(status ? { status } : {}),
    ...(customer_id ? { customerId: customer_id } : {}),
    ...(order_id ? { orderId: order_id } : {}),
    ...dateRange("rentedAt", date_from, date_to),
    ...(await searchClause(req, search)),
  });
}

async function historyFilter(req, { include_cancelled, date_from, date_to, customer_id, search }) {
  return shopFilter(req, {
    status: include_cancelled ? { $in: ["Completed", "Cancelled"] } : "Completed",
    ...(customer_id ? { customerId: customer_id } : {}),
    ...dateRange("rentedAt", date_from, date_to),
    ...(await searchClause(req, search)),
  });
}

async function getRental(req, id) {
  const rental = await withParties(Rental.findOne(accessibleFilter(req, { _id: id })), req).lean();
  if (!rental) throw notFound("Rental not found.");
  return rental;
}

function mergeItems(items) {
  const byId = new Map();
  for (const item of items) {
    const key = String(item.equipment_id);
    byId.set(key, (byId.get(key) || 0) + (item.quantity || 1));
  }
  return [...byId.entries()].map(([equipmentId, quantity]) => ({ equipmentId, quantity }));
}

// Creates one rental line per equipment item, all sharing an orderId. The
// order-level advance is split across lines in proportion to each line's
// expected value (it used to be copied onto every line, under-billing
// customers). Stock is taken atomically and everything commits together.
async function createRentals(req, { customer_id, items, expected_return_date, advance_amount, remark, payment_method }) {
  const lines = mergeItems(items);
  const customer = await findOwned(Customer, customer_id, req, { label: "Customer", activeShopOnly: true, lean: true });
  if (customer.isArchived) throw badRequest("This customer is archived. Restore them before renting.", "CUSTOMER_ARCHIVED");

  const equipmentDocs = await Equipment.find(shopFilter(req, { _id: { $in: lines.map((l) => l.equipmentId) } })).lean();
  const equipmentById = new Map(equipmentDocs.map((e) => [String(e._id), e]));
  for (const line of lines) {
    if (!equipmentById.has(line.equipmentId)) throw badRequest(`Equipment ${line.equipmentId} not found.`, "INVALID_EQUIPMENT");
  }

  const rentedAt = new Date();
  const expected = expected_return_date || null;
  if (expected && expected.toISOString().slice(0, 10) < rentedAt.toISOString().slice(0, 10)) {
    throw badRequest("Expected return date can't be in the past.", "VALIDATION_ERROR");
  }

  const priced = lines.map((line) => {
    const equipment = equipmentById.get(line.equipmentId);
    const rate = equipment.rentPerDay || 0;
    const estimate = expected ? round2(billableDays(rentedAt, expected) * rate * line.quantity) : null;
    return { ...line, equipment, rate, estimate, weight: estimate ?? rate * line.quantity };
  });

  const advance = round2(advance_amount || 0);
  if (expected) {
    const estimatedTotal = round2(priced.reduce((sum, l) => sum + l.estimate, 0));
    if (advance > estimatedTotal) {
      throw badRequest(`Advance amount cannot exceed the estimated rental total (${estimatedTotal.toFixed(2)}).`, "ADVANCE_TOO_HIGH", {
        estimated_total: estimatedTotal,
      });
    }
  }
  const shares = splitByWeight(advance, priced.map((l) => l.weight));
  const orderId = uuidv4();

  return withTransaction(async (session) => {
    const created = [];
    for (const [index, line] of priced.entries()) {
      await stock.takeForRental(req, line.equipment._id, line.quantity, session);
      const [rental] = await Rental.create(
        [
          {
            ...createScope(req),
            orderId,
            customerId: customer._id,
            equipmentId: line.equipment._id,
            rentedAt,
            expectedReturnDate: expected,
            quantity: line.quantity,
            dailyRate: line.rate,
            advanceAmount: shares[index],
            remark: remark || null,
            totalPrice: 0,
            ledger: true,
            createdBy: req.tenant.userId,
          },
        ],
        { session }
      );
      await payments.record(
        req,
        {
          kind: "advance",
          amount: shares[index],
          method: payment_method,
          customerId: customer._id,
          rentalId: rental._id,
          equipmentId: line.equipment._id,
          orderId,
          receivedAt: rentedAt,
        },
        session
      );
      created.push(rental.toObject());
    }
    // The draft's provisional holds are replaced by real stock movements.
    await Reservation.deleteMany(shopFilter(req, { customerId: customer._id }), { session });
    return created;
  });
}

async function currentRate(req, rental, session) {
  if (rental.dailyRate !== null && rental.dailyRate !== undefined) return rental.dailyRate;
  const equipment = await Equipment.findOne({ _id: rental.equipmentId, accountId: req.tenant.accountId })
    .select("rentPerDay")
    .session(session || null)
    .lean();
  return equipment?.rentPerDay || 0;
}

async function findActive(req, id, session) {
  const rental = await Rental.findOne(accessibleFilter(req, { _id: id, status: "Active" })).session(session || null);
  if (!rental) throw notFound("Active rental not found.");
  return rental;
}

async function updateActiveRental(req, id, { expected_return_date, advance_amount, remark, payment_method }) {
  return withTransaction(async (session) => {
    const rental = await findActive(req, id, session);
    const nextExpected = expected_return_date !== undefined ? expected_return_date : rental.expectedReturnDate;
    if (expected_return_date && expected_return_date.toISOString().slice(0, 10) < rental.rentedAt.toISOString().slice(0, 10)) {
      throw badRequest("Expected return date cannot be earlier than the rental date.", "VALIDATION_ERROR");
    }
    const nextAdvance = advance_amount !== undefined ? round2(advance_amount) : rental.advanceAmount;

    if (advance_amount !== undefined || expected_return_date !== undefined) {
      if (nextExpected) {
        const rate = await currentRate(req, rental, session);
        const estimate = round2(billableDays(rental.rentedAt, nextExpected) * rate * rental.quantity);
        if (nextAdvance > estimate) {
          throw badRequest(`Advance amount cannot exceed the estimated rental total (${estimate.toFixed(2)}).`, "ADVANCE_TOO_HIGH", {
            estimated_total: estimate,
          });
        }
      }
    }

    const delta = round2(nextAdvance - rental.advanceAmount);
    if (expected_return_date !== undefined) rental.expectedReturnDate = expected_return_date;
    if (remark !== undefined) rental.remark = remark;
    rental.advanceAmount = nextAdvance;
    await rental.save({ session });

    if (rental.ledger && delta !== 0) {
      await payments.record(
        req,
        {
          kind: delta > 0 ? "advance" : "refund",
          amount: Math.abs(delta),
          method: payment_method,
          customerId: rental.customerId,
          rentalId: rental._id,
          equipmentId: rental.equipmentId,
          orderId: rental.orderId,
          note: "Advance adjusted",
        },
        session
      );
    }
    return rental.toObject();
  });
}

// Cancelling returns the units and, by default, hands the advance back.
async function cancelRental(req, id, { refund_advance = true, payment_method } = {}) {
  return withTransaction(async (session) => {
    const rental = await findActive(req, id, session);
    await stock.returnFromRental(req, rental.equipmentId, rental.quantity, { session });
    rental.status = "Cancelled";
    rental.returnedAt = new Date();
    rental.amountDue = 0;
    if (refund_advance && rental.advanceAmount > 0) {
      rental.refundAmount = rental.advanceAmount;
      if (rental.ledger) {
        await payments.record(
          req,
          {
            kind: "refund",
            amount: rental.advanceAmount,
            method: payment_method,
            customerId: rental.customerId,
            rentalId: rental._id,
            equipmentId: rental.equipmentId,
            orderId: rental.orderId,
            note: "Rental cancelled",
          },
          session
        );
      }
    }
    await rental.save({ session });
    return rental.toObject();
  });
}

// Removes a mistaken entry entirely: stock goes back if it was still out, and
// its ledger rows go with it.
async function deleteRental(req, id) {
  await withTransaction(async (session) => {
    const rental = await findOwned(Rental, id, req, { label: "Rental", session });
    if (rental.status === "Active") {
      await stock.returnFromRental(req, rental.equipmentId, rental.quantity, { session });
    }
    await Payment.deleteMany({ accountId: req.tenant.accountId, rentalId: rental._id }, { session });
    await Rental.deleteOne({ _id: rental._id, accountId: req.tenant.accountId }, { session });
  });
}

function paymentStatusOf(due, received) {
  if (due <= 0) return "Paid";
  return received > 0 ? "Partial" : "Pending";
}

// Pure return/billing calculation shared by preview and completion.
//   gross    = billable days x agreed daily rate x quantity
//   discount = capped at the shop's max_discount_percent of gross (if set)
//   discount, late fee and batch-level damage are split across lines by gross
//   subtotal = gross - discount + late fee + damage   (never below 0)
//   total    = subtotal + tax
//   anything the advance doesn't cover is due; advance above total is refunded
function computeReturn({ lines, discount = 0, lateFee = 0, damage = 0, damagesByRental = new Map(), taxRatePercent = 0, amountPaid = 0, capPercent = null, returnedAt }) {
  const gross = lines.map((l) => round2(billableDays(l.rentedAt, returnedAt) * l.rate * l.quantity));
  const grossTotal = round2(gross.reduce((s, v) => s + v, 0));

  const requestedDiscount = round2(clamp(discount, 0, grossTotal));
  const discountCap = capPercent === null ? null : round2((grossTotal * capPercent) / 100);
  const discountApplied = discountCap === null ? requestedDiscount : Math.min(requestedDiscount, discountCap);

  const discountShares = splitByWeight(discountApplied, gross);
  const lateShares = splitByWeight(Math.max(lateFee, 0), gross);
  const damageShares = damagesByRental.size
    ? lines.map((l) => round2(damagesByRental.get(String(l.id))?.amount || 0))
    : splitByWeight(Math.max(damage, 0), gross);
  const taxRate = clamp(taxRatePercent, 0, 100);

  const partial = lines.map((line, i) => {
    const subtotal = round2(Math.max(gross[i] - discountShares[i] + lateShares[i] + damageShares[i], 0));
    const tax = round2((subtotal * taxRate) / 100);
    const total = round2(subtotal + tax);
    const advance = round2(line.advance);
    return {
      rental_id: line.id,
      days: billableDays(line.rentedAt, returnedAt),
      daily_rate: line.rate,
      quantity: line.quantity,
      gross_amount: gross[i],
      discount_amount: discountShares[i],
      late_fee_amount: lateShares[i],
      damage_amount: damageShares[i],
      subtotal,
      tax_rate_percent: taxRate,
      tax_amount: tax,
      total_amount: total,
      advance_amount: advance,
      pending_before_payment: round2(Math.max(total - advance, 0)),
      refund_amount: round2(Math.max(advance - total, 0)),
    };
  });

  const pendingTotal = round2(partial.reduce((s, l) => s + l.pending_before_payment, 0));
  const paidApplied = round2(clamp(amountPaid, 0, pendingTotal));
  const paidShares = splitByWeight(paidApplied, partial.map((l) => l.pending_before_payment));

  const result = partial.map((l, i) => {
    const due = round2(Math.max(l.pending_before_payment - paidShares[i], 0));
    const received = l.advance_amount - l.refund_amount + paidShares[i];
    return { ...l, paid_now: paidShares[i], amount_due: due, payment_status: paymentStatusOf(due, received) };
  });

  const sum = (key) => round2(result.reduce((s, l) => s + l[key], 0));
  return {
    returned_at: returnedAt,
    lines: result,
    totals: {
      gross_amount: grossTotal,
      discount_requested: requestedDiscount,
      discount_amount: sum("discount_amount"),
      discount_capped: discountApplied < requestedDiscount,
      discount_cap_percent: capPercent,
      late_fee_amount: sum("late_fee_amount"),
      damage_amount: sum("damage_amount"),
      tax_amount: sum("tax_amount"),
      total_amount: sum("total_amount"),
      advance_amount: sum("advance_amount"),
      refund_amount: sum("refund_amount"),
      paid_now: sum("paid_now"),
      amount_due: sum("amount_due"),
    },
  };
}

async function loadReturnContext(req, rentalIds, input, session) {
  const unique = [...new Set(rentalIds.map(String))];
  const rentals = await Rental.find(accessibleFilter(req, { _id: { $in: unique }, status: "Active" })).session(session || null);
  if (rentals.length !== unique.length) throw notFound("Active rental not found.");
  const customers = new Set(rentals.map((r) => String(r.customerId)));
  if (customers.size > 1) throw badRequest("Rentals returned together must belong to the same customer.", "MIXED_CUSTOMERS");

  const lines = [];
  for (const rental of rentals) {
    lines.push({
      id: rental._id,
      rental,
      rentedAt: rental.rentedAt,
      rate: await currentRate(req, rental, session),
      quantity: rental.quantity,
      advance: rental.advanceAmount || 0,
    });
  }

  const capValue = await getSettingValue(req.tenant.accountId, req.tenant.shopId, "max_discount_percent");
  const capPercent = capValue !== null && capValue !== "" && !Number.isNaN(Number(capValue)) ? clamp(Number(capValue), 0, 100) : null;
  const taxRatePercent = input.tax_rate_percent ?? req.account?.defaultTaxRatePercent ?? 0;

  const damagesByRental = new Map((input.damages || []).map((d) => [String(d.rental_id), d]));
  for (const id of damagesByRental.keys()) {
    if (!unique.includes(id)) throw badRequest("Damage was reported for a rental that isn't being returned.", "VALIDATION_ERROR");
  }

  const computed = computeReturn({
    lines,
    discount: input.discount_amount || 0,
    lateFee: input.late_fee_amount || 0,
    damage: input.damage_amount || 0,
    damagesByRental,
    taxRatePercent,
    amountPaid: input.amount_paid || 0,
    capPercent,
    returnedAt: input.returned_at || new Date(),
  });
  return { lines, computed, damagesByRental };
}

async function previewReturn(req, input) {
  const { computed } = await loadReturnContext(req, input.rental_ids, input);
  return computed;
}

// Completes one or more active rentals of the same customer in one
// transaction: stock back (damaged units flagged), charges persisted, invoice
// numbers issued and every payment/refund written to the ledger.
async function completeReturn(req, input) {
  return withTransaction(async (session) => {
    const { lines, computed, damagesByRental } = await loadReturnContext(req, input.rental_ids, input, session);
    const returnedAt = computed.returned_at;
    const completed = [];

    for (const [i, line] of lines.entries()) {
      const rental = line.rental;
      const result = computed.lines[i];
      const damage = damagesByRental.get(String(rental._id));
      const photoKeys = damage?.photos?.length ? (await normalizeFileRefs(damage.photos, { req, kinds: ["damage", "equipment"] })).slice(0, 6) : [];
      const reported = result.damage_amount > 0 || photoKeys.length > 0;
      const damagedQuantity = damage?.damaged_quantity !== undefined ? damage.damaged_quantity : damage && reported ? 1 : 0;
      if (damagedQuantity > rental.quantity) throw badRequest("Damaged quantity cannot exceed rented quantity.", "VALIDATION_ERROR");
      const damaged = damagedQuantity;

      await stock.returnFromRental(req, rental.equipmentId, rental.quantity, { damaged, session });
      if (damaged > 0) {
        await MaintenanceLog.create(
          [
            {
              accountId: rental.accountId,
              shopId: rental.shopId,
              equipmentId: rental.equipmentId,
              action: "Damage",
              quantity: damaged,
              remark: damage?.remark || null,
              cost: result.damage_amount,
              photos: photoKeys,
              rentalId: rental._id,
              customerId: rental.customerId,
              createdBy: req.tenant.userId,
            },
          ],
          { session }
        );
      }

      rental.status = "Completed";
      rental.returnedAt = returnedAt;
      rental.dailyRate = line.rate;
      rental.grossAmount = result.gross_amount;
      rental.discountAmount = result.discount_amount;
      rental.lateFeeAmount = result.late_fee_amount;
      rental.damageAmount = result.damage_amount;
      rental.taxRatePercent = result.tax_rate_percent;
      rental.taxAmount = result.tax_amount;
      rental.totalPrice = result.total_amount;
      rental.returnRevenueAmount = result.total_amount;
      rental.amountPaidOnReturn = result.paid_now;
      rental.refundAmount = result.refund_amount;
      rental.amountDue = result.amount_due;
      rental.paymentStatus = result.payment_status;
      rental.dueDate = result.amount_due > 0 ? input.due_date || rental.dueDate : null;
      if (!rental.invoiceNumber) rental.invoiceNumber = await payments.nextInvoiceNumber(rental.accountId, returnedAt, session);
      await rental.save({ session });

      if (rental.ledger) {
        const base = { customerId: rental.customerId, rentalId: rental._id, equipmentId: rental.equipmentId, orderId: rental.orderId, receivedAt: returnedAt };
        await payments.record(req, { ...base, kind: "return", amount: result.paid_now, method: input.payment_method }, session);
        await payments.record(req, { ...base, kind: "refund", amount: result.refund_amount, method: input.payment_method, note: "Advance above final total" }, session);
      }
      completed.push(rental.toObject());
    }
    return { rentals: completed, summary: computed };
  });
}

async function recordPayment(req, id, { amount_paid = 0, discount_amount = 0, due_date, payment_method }) {
  return withTransaction(async (session) => {
    const rental = await Rental.findOne(accessibleFilter(req, { _id: id, status: "Completed" })).session(session);
    if (!rental) throw notFound("Completed rental not found.");

    // An extra discount at settlement writes off part of what's still owed.
    const writeOff = round2(clamp(discount_amount, 0, rental.amountDue || 0));
    if (writeOff > 0) {
      rental.discountAmount = round2((rental.discountAmount || 0) + writeOff);
      rental.totalPrice = round2(rental.totalPrice - writeOff);
      rental.returnRevenueAmount = rental.totalPrice;
      rental.amountDue = round2(rental.amountDue - writeOff);
    }
    const paid = round2(clamp(amount_paid, 0, rental.amountDue || 0));
    if (paid <= 0 && writeOff <= 0) throw badRequest("Nothing is due on this rental.", "NOTHING_DUE");

    rental.amountPaidOnReturn = round2((rental.amountPaidOnReturn || 0) + paid);
    rental.amountDue = round2(Math.max(rental.amountDue - paid, 0));
    const received = rental.advanceAmount - (rental.refundAmount || 0) + rental.amountPaidOnReturn;
    rental.paymentStatus = paymentStatusOf(rental.amountDue, received);
    rental.dueDate = rental.amountDue > 0 ? due_date || rental.dueDate : null;
    await rental.save({ session });

    if (rental.ledger) {
      await payments.record(
        req,
        {
          kind: "due",
          amount: paid,
          method: payment_method,
          customerId: rental.customerId,
          rentalId: rental._id,
          equipmentId: rental.equipmentId,
          orderId: rental.orderId,
        },
        session
      );
    }
    return rental.toObject();
  });
}

async function listPayments(req, id) {
  const rental = await findOwned(Rental, id, req, { label: "Rental", select: "_id", lean: true });
  return Payment.find({ accountId: req.tenant.accountId, rentalId: rental._id }).sort({ receivedAt: 1 }).lean();
}

module.exports = {
  withParties,
  listFilter,
  historyFilter,
  getRental,
  createRentals,
  updateActiveRental,
  cancelRental,
  deleteRental,
  computeReturn,
  previewReturn,
  completeReturn,
  recordPayment,
  listPayments,
};
