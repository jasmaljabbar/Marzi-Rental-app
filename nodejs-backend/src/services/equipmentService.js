const Equipment = require("../models/Equipment");
const Category = require("../models/Category");
const Customer = require("../models/Customer");
const MaintenanceLog = require("../models/MaintenanceLog");
const InventoryTransaction = require("../models/InventoryTransaction");
const Expense = require("../models/Expense");
const Rental = require("../models/Rental");
const EquipmentSale = require("../models/EquipmentSale");
const stock = require("./stockService");
const payments = require("./paymentService");
const { shopFilter, accessibleFilter, createScope, findOwned } = require("../lib/tenantScope");
const { withTransaction } = require("../lib/transaction");
const { normalizeFileRefs, assertImageLimit, extractKey } = require("../storage");
const { conflict, badRequest } = require("../lib/errors");
const { nameKey, containsRegex } = require("../lib/text");
const { round2 } = require("../lib/money");

async function logsByEquipment(req, equipmentIds) {
  if (equipmentIds.length === 0) return new Map();
  const logs = await MaintenanceLog.find({ accountId: req.tenant.accountId, equipmentId: { $in: equipmentIds } })
    .sort({ createdAt: -1 })
    .lean();
  const map = new Map();
  for (const log of logs) {
    const key = String(log.equipmentId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(log);
  }
  return map;
}

function listFilter(req, { search, category_id, include_archived }) {
  const filter = shopFilter(req, { isArchived: include_archived ? true : { $ne: true } });
  if (search) filter.name = containsRegex(search);
  if (category_id) filter.categoryId = category_id;
  return filter;
}

// Categories are per shop, so equipment may only use a category of its own shop.
async function assertCategory(req, categoryId, shopId) {
  const category = await Category.findOne({ _id: categoryId, accountId: req.tenant.accountId, shopId }).select("_id").lean();
  if (!category) throw badRequest("Category not found in this shop.", "INVALID_CATEGORY");
  return category._id;
}

// Validates the photo list sent for an item and returns the storage keys to
// save. Removing a photo only drops its key from this item: the file itself is
// kept, because duplicated items share the same keys.
async function equipmentImages(req, images, existing = []) {
  const keys = await normalizeFileRefs(images, { req, kinds: ["equipment"], existing });
  if (keys === undefined) return undefined;
  assertImageLimit(keys, existing.map((value) => extractKey(value) || value));
  return keys;
}

async function getEquipment(req, id) {
  const equipment = await findOwned(Equipment, id, req, { label: "Equipment", lean: true });
  const logs = await logsByEquipment(req, [equipment._id]);
  return { equipment, logs: logs.get(String(equipment._id)) || [] };
}

async function createEquipment(req, input) {
  const categoryId = await assertCategory(req, input.category_id, req.tenant.shopId);
  const images = (await equipmentImages(req, input.images)) || [];
  const qty = input.stock_count || 0;
  const unitPrice = input.purchase_price_per_unit || 0;

  return withTransaction(async (session) => {
    const [equipment] = await Equipment.create(
      [
        {
          ...createScope(req),
          name: input.name,
          nameKey: nameKey(input.name),
          description: input.description ?? null,
          stockCount: qty,
          damagedCount: Math.min(input.damaged_count || 0, qty),
          rentPerDay: input.rent_per_day ?? 0,
          depositAmount: input.deposit_amount || 0,
          purchasePricePerUnit: unitPrice,
          usefulLifeYears: input.useful_life_years ?? undefined,
          images,
          categoryId,
        },
      ],
      { session }
    );
    if (qty > 0) {
      await InventoryTransaction.create(
        [
          {
            ...createScope(req),
            equipmentId: equipment._id,
            transactionType: "INITIAL_STOCK",
            quantity: qty,
            unitPrice,
            totalCost: round2(qty * unitPrice),
            previousStock: 0,
            newStock: qty,
            note: "Initial stock",
            createdBy: req.tenant.userId,
          },
        ],
        { session }
      );
    }
    if (qty > 0 && unitPrice > 0) {
      await Expense.create(
        [
          {
            ...createScope(req),
            category: "Equipment Purchase",
            amount: round2(qty * unitPrice),
            remark: `New equipment: ${input.name} — ${qty} unit(s) @ ${unitPrice} each`,
            equipmentId: equipment._id,
          },
        ],
        { session }
      );
    }
    return equipment.toObject();
  });
}

async function updateEquipment(req, id, input) {
  const equipment = await findOwned(Equipment, id, req, { label: "Equipment" });
  if (input.category_id !== undefined) equipment.categoryId = await assertCategory(req, input.category_id, equipment.shopId);
  if (input.images !== undefined) equipment.images = await equipmentImages(req, input.images, equipment.images);
  if (input.name !== undefined) {
    equipment.name = input.name;
    equipment.nameKey = nameKey(input.name);
  }
  const map = {
    description: "description",
    rent_per_day: "rentPerDay",
    deposit_amount: "depositAmount",
    purchase_price_per_unit: "purchasePricePerUnit",
    useful_life_years: "usefulLifeYears",
  };
  for (const [field, target] of Object.entries(map)) {
    if (input[field] !== undefined) equipment[target] = input[field];
  }
  await equipment.save();
  return equipment.toObject();
}

// Equipment with rental or sale history can only be archived, never deleted,
// so past invoices and reports keep their item names.
async function deleteEquipment(req, id) {
  const equipment = await findOwned(Equipment, id, req, { label: "Equipment", lean: true });
  const scope = { accountId: req.tenant.accountId, equipmentId: equipment._id };
  const [rentals, sales] = await Promise.all([Rental.countDocuments(scope), EquipmentSale.countDocuments(scope)]);
  if (rentals + sales > 0) {
    throw conflict(
      `Cannot delete this equipment — it has ${rentals} rental(s) and ${sales} sale(s) on record. Archive it instead.`,
      "EQUIPMENT_HAS_HISTORY"
    );
  }
  await withTransaction(async (session) => {
    await Promise.all([
      Expense.deleteMany(scope, { session }),
      InventoryTransaction.deleteMany(scope, { session }),
      MaintenanceLog.deleteMany(scope, { session }),
    ]);
    await Equipment.deleteOne({ _id: equipment._id, accountId: req.tenant.accountId }, { session });
  });
}

async function setArchived(req, id, archived) {
  const equipment = await findOwned(Equipment, id, req, { label: "Equipment" });
  if (archived) {
    const active = await Rental.countDocuments({ accountId: req.tenant.accountId, equipmentId: equipment._id, status: "Active" });
    if (active > 0) {
      throw conflict(
        `Cannot archive this equipment — it is currently in ${active} active rental${active === 1 ? "" : "s"}. Complete or cancel all rentals before archiving.`,
        "EQUIPMENT_IN_USE"
      );
    }
  }
  equipment.isArchived = archived;
  equipment.archivedAt = archived ? new Date() : null;
  try {
    await equipment.save();
  } catch (err) {
    if (err.code === 11000) throw conflict("Cannot restore: another item already uses this name. Rename one first.", "DUPLICATE");
    throw err;
  }
  return equipment.toObject();
}

async function duplicateEquipment(req, id) {
  const source = await findOwned(Equipment, id, req, { label: "Equipment", lean: true });
  let copyName = `${source.name} (Copy)`;
  for (let suffix = 2; await Equipment.exists({ accountId: req.tenant.accountId, shopId: source.shopId, nameKey: nameKey(copyName), isArchived: false }); suffix++) {
    copyName = `${source.name} (Copy ${suffix})`;
  }
  const copy = await Equipment.create({
    accountId: source.accountId,
    shopId: source.shopId,
    name: copyName,
    nameKey: nameKey(copyName),
    description: source.description,
    stockCount: 0,
    damagedCount: 0,
    rentPerDay: source.rentPerDay,
    depositAmount: source.depositAmount,
    purchasePricePerUnit: source.purchasePricePerUnit,
    usefulLifeYears: source.usefulLifeYears,
    images: source.images,
    categoryId: source.categoryId,
  });
  return copy.toObject();
}

async function addStock(req, id, { quantity_added, unit_price, note }) {
  await findOwned(Equipment, id, req, { label: "Equipment", select: "_id", lean: true });
  const unitPrice = unit_price || 0;
  return withTransaction(async (session) => {
    const updated = await stock.addStock(req, id, quantity_added, session);
    await InventoryTransaction.create(
      [
        {
          accountId: updated.accountId,
          shopId: updated.shopId,
          equipmentId: updated._id,
          transactionType: "STOCK_IN",
          quantity: quantity_added,
          unitPrice,
          totalCost: round2(unitPrice * quantity_added),
          previousStock: updated.stockCount - quantity_added,
          newStock: updated.stockCount,
          note: note || null,
          createdBy: req.tenant.userId,
        },
      ],
      { session }
    );
    if (unitPrice > 0) {
      await Expense.create(
        [
          {
            accountId: updated.accountId,
            shopId: updated.shopId,
            category: "Stock Purchase",
            amount: round2(quantity_added * unitPrice),
            remark: `Stock added: ${updated.name} — ${quantity_added} unit(s) @ ${unitPrice} each`,
            equipmentId: updated._id,
          },
        ],
        { session }
      );
    }
    return updated.toObject();
  });
}

async function markScrap(req, id, { quantity, remark }) {
  return withTransaction(async (session) => {
    const updated = await stock.removePermanently(req, id, quantity, session);
    await InventoryTransaction.create(
      [
        {
          accountId: updated.accountId,
          shopId: updated.shopId,
          equipmentId: updated._id,
          transactionType: "SCRAP",
          quantity,
          unitPrice: 0,
          totalCost: 0,
          previousStock: updated.stockCount + quantity,
          newStock: updated.stockCount,
          note: remark || "Marked as scrap",
          createdBy: req.tenant.userId,
        },
      ],
      { session }
    );
    await MaintenanceLog.create(
      [
        {
          accountId: updated.accountId,
          shopId: updated.shopId,
          equipmentId: updated._id,
          action: "Scrap",
          quantity,
          remark: `${quantity} unit${quantity === 1 ? "" : "s"} scrapped${remark ? ` - ${remark}` : ""}`,
          cost: 0,
          createdBy: req.tenant.userId,
        },
      ],
      { session }
    );
    return updated.toObject();
  });
}

async function sellEquipment(req, id, { customer_id, quantity, selling_price, amount_paid, remark, payment_method }) {
  const equipment = await findOwned(Equipment, id, req, { label: "Equipment", lean: true });
  const customer = await Customer.findOne(accessibleFilter(req, { _id: customer_id })).select("_id").lean();
  if (!customer) throw badRequest("Customer not found.", "INVALID_CUSTOMER");

  const unitPrice = selling_price || 0;
  const totalPrice = round2(quantity * unitPrice);
  const paid = round2(Math.min(Math.max(amount_paid || 0, 0), totalPrice));
  const due = round2(Math.max(totalPrice - paid, 0));
  // Book value is the recorded acquisition cost (the depreciation schedule is
  // a reporting view and isn't applied to individual sales).
  const bookValuePerUnit = equipment.purchasePricePerUnit || 0;
  const totalBookValue = round2(bookValuePerUnit * quantity);

  return withTransaction(async (session) => {
    const updated = await stock.removePermanently(req, id, quantity, session);
    const [sale] = await EquipmentSale.create(
      [
        {
          accountId: updated.accountId,
          shopId: updated.shopId,
          equipmentId: updated._id,
          customerId: customer._id,
          quantity,
          unitPrice,
          totalPrice,
          bookValuePerUnit,
          totalBookValue,
          gainLoss: round2(totalPrice - totalBookValue),
          amountPaid: paid,
          amountDue: due,
          paymentStatus: due <= 0 ? "Paid" : paid > 0 ? "Partial" : "Pending",
          remark: remark || null,
          createdBy: req.tenant.userId,
        },
      ],
      { session }
    );
    await InventoryTransaction.create(
      [
        {
          accountId: updated.accountId,
          shopId: updated.shopId,
          equipmentId: updated._id,
          transactionType: "SALE",
          quantity,
          unitPrice,
          totalCost: totalPrice,
          previousStock: updated.stockCount + quantity,
          newStock: updated.stockCount,
          note: remark || "Equipment sold",
          createdBy: req.tenant.userId,
        },
      ],
      { session }
    );
    await payments.record(
      req,
      { kind: "sale", amount: paid, method: payment_method, customerId: customer._id, saleId: sale._id, equipmentId: updated._id },
      session
    );
    return sale.toObject();
  });
}

async function recordSalePayment(req, id, { amount_paid, payment_method }) {
  return withTransaction(async (session) => {
    const sale = await findOwned(EquipmentSale, id, req, { label: "Sale", session });
    const applied = round2(Math.min(amount_paid, sale.amountDue || 0));
    if (applied <= 0) throw badRequest("This sale has nothing left to pay.", "NOTHING_DUE");
    sale.amountPaid = round2((sale.amountPaid || 0) + applied);
    sale.amountDue = round2(Math.max((sale.amountDue || 0) - applied, 0));
    sale.paymentStatus = sale.amountDue <= 0 ? "Paid" : "Partial";
    await sale.save({ session });
    await payments.record(
      req,
      { kind: "sale", amount: applied, method: payment_method, customerId: sale.customerId, saleId: sale._id, equipmentId: sale.equipmentId },
      session
    );
    return sale.toObject();
  });
}

async function createMaintenance(req, { equipment_id, action, remark, cost, photos, rental_id, customer_id, quantity = 1 }) {
  const equipment = await findOwned(Equipment, equipment_id, req, { label: "Equipment", lean: true });
  let rentalId = null;
  let customerId = null;
  if (rental_id) rentalId = (await findOwned(Rental, rental_id, req, { label: "Rental", select: "_id", lean: true }))._id;
  if (customer_id) customerId = (await findOwned(Customer, customer_id, req, { label: "Customer", select: "_id", lean: true }))._id;
  const photoKeys = ((await normalizeFileRefs(photos, { req, kinds: ["damage", "equipment"] })) || []).slice(0, 6);
  const amount = round2(cost || 0);

  return withTransaction(async (session) => {
    if (action === "Damage") await stock.markDamaged(req, equipment._id, quantity, session);
    else await stock.markRepaired(req, equipment._id, quantity, session);
    const [log] = await MaintenanceLog.create(
      [
        {
          accountId: equipment.accountId,
          shopId: equipment.shopId,
          equipmentId: equipment._id,
          action,
          quantity,
          remark: remark || null,
          cost: amount,
          photos: photoKeys,
          rentalId,
          customerId,
          createdBy: req.tenant.userId,
        },
      ],
      { session }
    );
    // Repair spend is real cash out, so it also lands in expenses for P&L.
    if (action === "Repair" && amount > 0) {
      await Expense.create(
        [
          {
            accountId: equipment.accountId,
            shopId: equipment.shopId,
            category: "Repair Cost",
            amount,
            remark: remark || `Repair: ${equipment.name}`,
            equipmentId: equipment._id,
          },
        ],
        { session }
      );
    }
    return log.toObject();
  });
}

function salesFilter(req, { customer_id, equipment_id, payment_status }) {
  const filter = shopFilter(req);
  if (customer_id) filter.customerId = customer_id;
  if (equipment_id) filter.equipmentId = equipment_id;
  if (payment_status) filter.paymentStatus = payment_status;
  return filter;
}

async function salesSummary(req, { start_date, end_date }) {
  const match = { accountId: req.tenant.accountId, shopId: req.tenant.shopId };
  if (start_date || end_date) {
    match.soldAt = {};
    if (start_date) match.soldAt.$gte = start_date;
    if (end_date) match.soldAt.$lte = end_date;
  }
  const [result] = await EquipmentSale.aggregate([
    { $match: match },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              salesCount: { $sum: 1 },
              unitsSold: { $sum: "$quantity" },
              totalRevenue: { $sum: "$totalPrice" },
              totalBookValue: { $sum: "$totalBookValue" },
              totalGainLoss: { $sum: "$gainLoss" },
              totalPaid: { $sum: "$amountPaid" },
              totalDue: { $sum: "$amountDue" },
            },
          },
        ],
        byEquipment: [
          {
            $group: {
              _id: "$equipmentId",
              unitsSold: { $sum: "$quantity" },
              revenue: { $sum: "$totalPrice" },
              bookValue: { $sum: "$totalBookValue" },
              gainLoss: { $sum: "$gainLoss" },
            },
          },
          { $lookup: { from: "equipment", localField: "_id", foreignField: "_id", as: "equipment", pipeline: [{ $project: { name: 1 } }] } },
          { $sort: { revenue: -1 } },
        ],
      },
    },
  ]);
  const totals = result.totals[0] || {};
  return {
    sales_count: totals.salesCount || 0,
    units_sold: totals.unitsSold || 0,
    total_revenue: round2(totals.totalRevenue),
    total_book_value: round2(totals.totalBookValue),
    total_gain_loss: round2(totals.totalGainLoss),
    total_paid: round2(totals.totalPaid),
    total_due: round2(totals.totalDue),
    by_equipment: result.byEquipment.map((row) => ({
      equipment_id: row._id,
      equipment_name: row.equipment?.[0]?.name || "Unknown",
      units_sold: row.unitsSold,
      revenue: round2(row.revenue),
      book_value: round2(row.bookValue),
      gain_loss: round2(row.gainLoss),
    })),
  };
}

module.exports = {
  logsByEquipment,
  listFilter,
  getEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  setArchived,
  duplicateEquipment,
  addStock,
  markScrap,
  sellEquipment,
  recordSalePayment,
  createMaintenance,
  salesFilter,
  salesSummary,
};
