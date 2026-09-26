const { syncFields } = require("../lib/sync");
const Expense = require("../models/Expense");
const Equipment = require("../models/Equipment");
const RecurringExpenseTemplate = require("../models/RecurringExpenseTemplate");
const { shopFilter, createScope, findOwned } = require("../lib/tenantScope");
const { normalizeFileRef } = require("../storage");
const { badRequest } = require("../lib/errors");
const { containsRegex } = require("../lib/text");
const { round2 } = require("../lib/money");

function periodKeyOf(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function assertEquipment(req, equipmentId) {
  if (!equipmentId) return null;
  const equipment = await Equipment.findOne({ _id: equipmentId, accountId: req.tenant.accountId }).select("_id").lean();
  if (!equipment) throw badRequest("Equipment not found.", "INVALID_EQUIPMENT");
  return equipment._id;
}

// Materialises recurring expenses that have come due this month. The unique
// (template, period) index makes this safe under concurrent requests: a
// duplicate insert just fails and is ignored.
async function generateDueRecurringExpenses(req, now = new Date()) {
  const templates = await RecurringExpenseTemplate.find(shopFilter(req, { isActive: true })).lean();
  const periodKey = periodKeyOf(now);
  for (const template of templates) {
    if (now.getUTCDate() < template.dayOfMonth) continue;
    try {
      await Expense.updateOne(
        { accountId: template.accountId, recurringTemplateId: template._id, periodKey },
        {
          $setOnInsert: {
            accountId: template.accountId,
            shopId: template.shopId,
            category: template.category,
            amount: template.amount,
            remark: template.remark,
            equipmentId: template.equipmentId,
            recurringTemplateId: template._id,
            periodKey,
            date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), template.dayOfMonth)),
            isArchived: false,
          },
        },
        { upsert: true }
      );
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }
}

function listFilter(req, { include_archived, category, date_from, date_to, search }) {
  const filter = shopFilter(req, { isArchived: include_archived ? true : { $ne: true } });
  if (category) filter.category = category;
  if (date_from || date_to) {
    filter.date = {};
    if (date_from) filter.date.$gte = date_from;
    if (date_to) filter.date.$lte = date_to;
  }
  if (search) {
    filter.$or = [{ category: containsRegex(search) }, { remark: containsRegex(search) }];
  }
  return filter;
}

async function createExpense(req, input) {
  const expense = await Expense.create({
    ...createScope(req),
    ...syncFields(req),
    category: input.category,
    amount: round2(input.amount),
    remark: input.remark ?? null,
    paymentMode: input.payment_mode || "Cash",
    receiptUrl: (await normalizeFileRef(input.receipt_url, { req, kinds: ["receipt"] })) ?? null,
    equipmentId: await assertEquipment(req, input.equipment_id),
    date: input.date || new Date(),
  });
  return expense.toObject();
}

async function updateExpense(req, id, input) {
  const expense = await findOwned(Expense, id, req, { label: "Expense" });
  if (input.category !== undefined) expense.category = input.category;
  if (input.amount !== undefined) expense.amount = round2(input.amount);
  if (input.remark !== undefined) expense.remark = input.remark;
  if (input.payment_mode !== undefined) expense.paymentMode = input.payment_mode;
  if (input.date !== undefined) expense.date = input.date;
  if (input.receipt_url !== undefined) {
    expense.receiptUrl = await normalizeFileRef(input.receipt_url, { req, kinds: ["receipt"], existing: [expense.receiptUrl] });
  }
  if (input.equipment_id !== undefined) expense.equipmentId = await assertEquipment(req, input.equipment_id);
  await expense.save();
  return expense.toObject();
}

async function deleteExpense(req, id) {
  const expense = await findOwned(Expense, id, req, { label: "Expense", select: "_id", lean: true });
  await Expense.deleteOne({ _id: expense._id, accountId: req.tenant.accountId });
}

async function setArchived(req, id, archived) {
  const expense = await findOwned(Expense, id, req, { label: "Expense" });
  expense.isArchived = archived;
  expense.archivedAt = archived ? new Date() : null;
  await expense.save();
  return expense.toObject();
}

async function listRecurring(req) {
  return RecurringExpenseTemplate.find(shopFilter(req)).sort({ dayOfMonth: 1 }).lean();
}

async function createRecurring(req, input) {
  const template = await RecurringExpenseTemplate.create({
    ...createScope(req),
    category: input.category,
    amount: round2(input.amount),
    remark: input.remark ?? null,
    dayOfMonth: input.day_of_month,
    equipmentId: await assertEquipment(req, input.equipment_id),
  });
  return template.toObject();
}

async function updateRecurring(req, id, input) {
  const template = await findOwned(RecurringExpenseTemplate, id, req, { label: "Recurring expense" });
  if (input.category !== undefined) template.category = input.category;
  if (input.amount !== undefined) template.amount = round2(input.amount);
  if (input.remark !== undefined) template.remark = input.remark;
  if (input.day_of_month !== undefined) template.dayOfMonth = input.day_of_month;
  if (input.equipment_id !== undefined) template.equipmentId = await assertEquipment(req, input.equipment_id);
  if (input.is_active !== undefined) template.isActive = input.is_active;
  await template.save();
  return template.toObject();
}

async function deleteRecurring(req, id) {
  const template = await findOwned(RecurringExpenseTemplate, id, req, { label: "Recurring expense", select: "_id", lean: true });
  await RecurringExpenseTemplate.deleteOne({ _id: template._id, accountId: req.tenant.accountId });
}

module.exports = {
  generateDueRecurringExpenses,
  listFilter,
  createExpense,
  updateExpense,
  deleteExpense,
  setArchived,
  listRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  periodKeyOf,
};
