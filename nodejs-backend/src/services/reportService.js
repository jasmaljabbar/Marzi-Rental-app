const Rental = require("../models/Rental");
const Payment = require("../models/Payment");
const Expense = require("../models/Expense");
const EquipmentSale = require("../models/EquipmentSale");
const Equipment = require("../models/Equipment");
const Category = require("../models/Category");
const Customer = require("../models/Customer");
const { computeDepreciationExpense } = require("./depreciationService");
const { getSettingValue } = require("./settingService");
const { round2 } = require("../lib/money");

// Equipment/stock purchases are capitalised and depreciated, so they're not
// operating expenses (that would count the asset twice).
const CAPITALIZED_EXPENSE_CATEGORIES = ["Equipment Purchase", "Stock Purchase"];
const RENTAL_INCOME_KINDS = ["advance", "return", "due"];
const DAY_MS = 24 * 60 * 60 * 1000;

// ---- time helpers: `tz` is the client's offset from UTC in minutes (IST = 330)

function localParts(date, tz) {
  const shifted = new Date(date.getTime() + tz * 60 * 1000);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
}

function localMidnight(y, m, d, tz) {
  return new Date(Date.UTC(y, m, d) - tz * 60 * 1000);
}

function bucketKey(date, tz, monthly) {
  const { y, m, d } = localParts(date, tz);
  const mm = String(m + 1).padStart(2, "0");
  return monthly ? `${y}-${mm}` : `${y}-${mm}-${String(d).padStart(2, "0")}`;
}

// ---- cash received from rentals, in [start, end)
//
// Rentals created since the payment ledger exists record every advance,
// payment and refund as a Payment row dated when it happened. Older rentals
// (ledger: false) fall back to their stored fields: advance on the rental
// date, amount paid on return on the return date.
async function rentalCashEvents(scope, start, end) {
  const range = {};
  if (start) range.$gte = start;
  if (end) range.$lt = end;
  const hasRange = Boolean(start || end);

  const [ledgerRows, legacyRentals] = await Promise.all([
    Payment.find({
      ...scope,
      kind: { $in: [...RENTAL_INCOME_KINDS, "refund"] },
      rentalId: { $ne: null },
      ...(hasRange ? { receivedAt: range } : {}),
    })
      .select("kind amount receivedAt rentalId equipmentId customerId")
      .lean(),
    Rental.find({
      ...scope,
      ledger: { $ne: true },
      ...(hasRange ? { $or: [{ rentedAt: range }, { returnedAt: range }] } : {}),
    })
      .select("rentedAt returnedAt advanceAmount amountPaidOnReturn refundAmount equipmentId customerId")
      .lean(),
  ]);

  const inRange = (date) => date && (!start || date >= start) && (!end || date < end);
  const events = ledgerRows.map((p) => ({
    kind: p.kind,
    method: p.method,
    date: p.receivedAt,
    amount: p.kind === "refund" ? -p.amount : p.amount,
    rentalId: p.rentalId,
    equipmentId: p.equipmentId,
    customerId: p.customerId,
  }));
  for (const r of legacyRentals) {
    if (r.advanceAmount > 0 && inRange(r.rentedAt)) {
      events.push({ kind: "advance", date: r.rentedAt, amount: r.advanceAmount, rentalId: r._id, equipmentId: r.equipmentId, customerId: r.customerId });
    }
    const netOnReturn = (r.amountPaidOnReturn || 0) - (r.refundAmount || 0);
    if (netOnReturn !== 0 && inRange(r.returnedAt)) {
      events.push({ kind: "return", date: r.returnedAt, amount: netOnReturn, rentalId: r._id, equipmentId: r.equipmentId, customerId: r.customerId });
    }
  }
  return events;
}

function sumAmounts(rows) {
  return round2(rows.reduce((s, r) => s + r.amount, 0));
}

async function expensesIn(scope, start, end, { operatingOnly = false } = {}) {
  const match = { ...scope, isArchived: { $ne: true } };
  if (start || end) match.date = { ...(start ? { $gte: start } : {}), ...(end ? { $lt: end } : {}) };
  if (operatingOnly) match.category = { $nin: CAPITALIZED_EXPENSE_CATEGORIES };
  return Expense.find(match).select("category amount date equipmentId").lean();
}

async function saleRevenueIn(scope, start, end) {
  const [row] = await EquipmentSale.aggregate([
    { $match: { ...scope, soldAt: { $gte: start, $lt: end } } },
    { $group: { _id: null, total: { $sum: "$totalPrice" } } },
  ]);
  return round2(row?.total || 0);
}

// Net profit for [start, end): cash rental income + equipment sales, minus
// operating expenses, minus straight-line depreciation for the same window.
async function netProfit(req, { start_date, end_date }) {
  const scope = { accountId: req.tenant.accountId, shopId: req.tenant.shopId };
  const start = new Date(start_date);
  const end = new Date(end_date);

  const [events, saleRevenue, expenses, depreciation] = await Promise.all([
    rentalCashEvents(scope, start, end),
    saleRevenueIn(scope, start, end),
    expensesIn(scope, start, end, { operatingOnly: true }),
    computeDepreciationExpense({ start, end, accountId: scope.accountId, shopId: scope.shopId }),
  ]);

  const rentalRevenue = sumAmounts(events);
  const operatingExpenses = round2(expenses.reduce((s, e) => s + e.amount, 0));
  const revenue = round2(rentalRevenue + saleRevenue);

  const byEquipment = new Map();
  const bump = (id, field, amount) => {
    if (!id) return;
    const key = String(id);
    const row = byEquipment.get(key) || { revenue: 0, operating_expenses: 0, depreciation: 0 };
    row[field] += amount;
    byEquipment.set(key, row);
  };
  events.forEach((e) => bump(e.equipmentId, "revenue", e.amount));
  expenses.forEach((e) => bump(e.equipmentId, "operating_expenses", e.amount));
  depreciation.byEquipment.forEach((d) => bump(d.equipment_id, "depreciation", d.depreciation));
  const sales = await EquipmentSale.aggregate([
    { $match: { ...scope, soldAt: { $gte: start, $lt: end } } },
    { $group: { _id: "$equipmentId", total: { $sum: "$totalPrice" } } },
  ]);
  sales.forEach((s) => bump(s._id, "revenue", s.total));

  const names = await Equipment.find({ accountId: scope.accountId, _id: { $in: [...byEquipment.keys()] } }).select("name").lean();
  const nameById = new Map(names.map((e) => [String(e._id), e.name]));
  const netProfitByEquipment = [...byEquipment.entries()]
    .map(([id, row]) => ({
      equipment_id: id,
      equipment_name: nameById.get(id) || "Unknown",
      revenue: round2(row.revenue),
      operating_expenses: round2(row.operating_expenses),
      depreciation: round2(row.depreciation),
      net_profit: round2(row.revenue - row.operating_expenses - row.depreciation),
    }))
    .sort((a, b) => a.net_profit - b.net_profit);

  return {
    range_start: start.toISOString(),
    range_end: end.toISOString(),
    rental_revenue: rentalRevenue,
    equipment_sale_revenue: saleRevenue,
    revenue,
    operating_expenses: operatingExpenses,
    depreciation_expense: depreciation.total,
    depreciation_by_equipment: depreciation.byEquipment,
    net_profit_by_equipment: netProfitByEquipment,
    net_profit: round2(revenue - operatingExpenses - depreciation.total),
  };
}

// Everything the home dashboard shows, computed server-side over the whole
// shop (the web app used to download capped lists and aggregate in the browser).
async function dashboard(req, { tz = 0 } = {}) {
  const scope = { accountId: req.tenant.accountId, shopId: req.tenant.shopId };
  const now = new Date();
  const { y, m, d } = localParts(now, tz);
  const startOfThisMonth = localMidnight(y, m, 1, tz);
  const startOfLastMonth = localMidnight(y, m - 1, 1, tz);
  const startOfToday = localMidnight(y, m, d, tz);

  const thresholdValue = await getSettingValue(scope.accountId, scope.shopId, "low_stock_threshold");
  const lowStockThreshold = thresholdValue !== null && thresholdValue !== "" ? Number(thresholdValue) || 0 : 2;

  const [active, equipment, customersCount, categoriesCount, thisMonthEvents, lastMonthEvents, outstanding, paymentsOverdue] = await Promise.all([
    Rental.find({ ...scope, status: "Active" })
      .populate({ path: "customerId", select: "name phone photoUrl", match: { accountId: scope.accountId } })
      .populate({ path: "equipmentId", select: "name", match: { accountId: scope.accountId } })
      .sort({ expectedReturnDate: 1 })
      .lean(),
    Equipment.find({ ...scope, isArchived: { $ne: true } }).select("stockCount damagedCount").lean(),
    Customer.countDocuments({ ...scope, isArchived: { $ne: true } }),
    Category.countDocuments({ ...scope, isArchived: { $ne: true } }),
    rentalCashEvents(scope, startOfThisMonth, null),
    rentalCashEvents(scope, startOfLastMonth, startOfThisMonth),
    Rental.aggregate([
      { $match: { ...scope, status: "Completed", amountDue: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$amountDue" }, count: { $sum: 1 } } },
    ]),
    Rental.countDocuments({ ...scope, status: "Completed", amountDue: { $gt: 0 }, dueDate: { $ne: null, $lt: startOfToday } }),
  ]);

  const alerts = active
    .filter((r) => r.expectedReturnDate)
    .map((r) => ({ rental: r, days: Math.floor((new Date(r.expectedReturnDate).getTime() - startOfToday.getTime()) / DAY_MS) }))
    .filter((a) => a.days <= 2)
    .sort((a, b) => a.days - b.days);
  const overdue = alerts.filter((a) => a.days < 0);
  const dueSoon = alerts.filter((a) => a.days >= 0);

  const damagedUnits = equipment.reduce((s, e) => s + (e.damagedCount || 0), 0);
  const onHandUnits = equipment.reduce((s, e) => s + (e.stockCount || 0), 0);
  const rentedOutUnits = active.reduce((s, r) => s + r.quantity, 0);
  // stockCount already includes damaged units and excludes rented-out ones.
  const fleetSize = onHandUnits + rentedOutUnits;
  const thisMonth = sumAmounts(thisMonthEvents);
  const lastMonth = sumAmounts(lastMonthEvents);

  return {
    generated_at: now,
    active_rentals: active.length,
    overdue_count: overdue.length,
    due_soon_count: dueSoon.length,
    alerts: [...overdue, ...dueSoon].slice(0, 8).map((a) => ({ rental: a.rental, days_until_due: a.days })),
    revenue: {
      this_month: thisMonth,
      last_month: lastMonth,
      trend_percent: lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null,
    },
    inventory: {
      items: equipment.length,
      on_hand_units: onHandUnits,
      damaged_units: damagedUnits,
      rented_out_units: rentedOutUnits,
      fleet_size: fleetSize,
      utilization_percent: fleetSize > 0 ? Math.round((rentedOutUnits / fleetSize) * 100) : 0,
      low_stock_threshold: lowStockThreshold,
      low_stock_count: equipment.filter((e) => (e.stockCount || 0) - (e.damagedCount || 0) <= lowStockThreshold).length,
    },
    customers_count: customersCount,
    categories_count: categoriesCount,
    outstanding_due: {
      amount: round2(outstanding[0]?.total || 0),
      rentals: outstanding[0]?.count || 0,
      // Dues whose promised payment date has passed.
      overdue_rentals: paymentsOverdue,
    },
  };
}

function topN(map, n) {
  return [...map.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, n);
}

// Reports page data for [start, end): cash in, expenses, trend buckets and
// top categories/equipment/customers, plus all-time totals.
async function summary(req, { start_date, end_date, tz = 0 }) {
  const scope = { accountId: req.tenant.accountId, shopId: req.tenant.shopId };
  const start = new Date(start_date);
  const end = new Date(end_date);
  const monthly = (end - start) / DAY_MS > 62;

  const [events, allEvents, expenses, allExpenseTotal, statusCounts, saleRevenue] = await Promise.all([
    rentalCashEvents(scope, start, end),
    rentalCashEvents(scope, null, null),
    expensesIn(scope, start, end),
    Expense.aggregate([{ $match: { ...scope, isArchived: { $ne: true } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Rental.aggregate([
      { $match: { ...scope } },
      { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$totalPrice" }, rentedInRange: { $sum: { $cond: [{ $and: [{ $gte: ["$rentedAt", start] }, { $lt: ["$rentedAt", end] }] }, 1, 0] } } } },
    ]),
    saleRevenueIn(scope, start, end),
  ]);

  const moneyReceived = sumAmounts(events);
  const moneyReceivedAllTime = sumAmounts(allEvents);
  const expensesInRange = round2(expenses.reduce((s, e) => s + e.amount, 0));
  const expensesAllTime = round2(allExpenseTotal[0]?.total || 0);
  const byStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s]));
  const grossAllTime = round2(byStatus.Completed?.total || 0);

  const trend = new Map();
  const bucket = (key) => trend.get(key) || trend.set(key, { bucket: key, income: 0, expense: 0 }).get(key);
  events.forEach((e) => (bucket(bucketKey(e.date, tz, monthly)).income += e.amount));
  expenses.forEach((e) => (bucket(bucketKey(e.date, tz, monthly)).expense += e.amount));

  const expenseByCategory = new Map();
  expenses.forEach((e) => expenseByCategory.set(e.category, (expenseByCategory.get(e.category) || 0) + e.amount));

  const equipmentIds = [...new Set(events.map((e) => String(e.equipmentId)).filter(Boolean))];
  const customerIds = [...new Set(events.map((e) => String(e.customerId)).filter(Boolean))];
  const rentalsInRange = await Rental.find({ ...scope, rentedAt: { $gte: start, $lt: end } }).select("equipmentId customerId").lean();
  const [equipmentDocs, customerDocs] = await Promise.all([
    Equipment.find({ accountId: scope.accountId, _id: { $in: [...new Set([...equipmentIds, ...rentalsInRange.map((r) => String(r.equipmentId))])] } })
      .select("name categoryId")
      .lean(),
    Customer.find({ accountId: scope.accountId, _id: { $in: [...new Set([...customerIds, ...rentalsInRange.map((r) => String(r.customerId))])] } })
      .select("name")
      .lean(),
  ]);
  const categories = await Category.find({ accountId: scope.accountId, _id: { $in: equipmentDocs.map((e) => e.categoryId) } })
    .select("name")
    .lean();
  const equipmentById = new Map(equipmentDocs.map((e) => [String(e._id), e]));
  const categoryName = new Map(categories.map((c) => [String(c._id), c.name]));
  const customerName = new Map(customerDocs.map((c) => [String(c._id), c.name]));

  const byCategory = new Map();
  const byEquipment = new Map();
  const byCustomer = new Map();
  const add = (map, key, revenue, count = 0) => {
    const row = map.get(key) || { revenue: 0, count: 0 };
    row.revenue += revenue;
    row.count += count;
    map.set(key, row);
  };
  for (const e of events) {
    const eq = equipmentById.get(String(e.equipmentId));
    add(byCategory, eq ? categoryName.get(String(eq.categoryId)) || "Uncategorized" : "Uncategorized", e.amount);
    add(byEquipment, String(e.equipmentId), e.amount);
    add(byCustomer, String(e.customerId), e.amount);
  }
  for (const r of rentalsInRange) {
    add(byEquipment, String(r.equipmentId), 0, 1);
    add(byCustomer, String(r.customerId), 0, 1);
  }

  return {
    range_start: start.toISOString(),
    range_end: end.toISOString(),
    bucket: monthly ? "month" : "day",
    money_received: moneyReceived,
    money_received_all_time: moneyReceivedAllTime,
    equipment_sale_revenue: saleRevenue,
    expenses: expensesInRange,
    expenses_all_time: expensesAllTime,
    net_cash: round2(moneyReceived - expensesInRange),
    net_all_time: round2(moneyReceivedAllTime - expensesAllTime),
    completed_count: byStatus.Completed?.count || 0,
    cancelled_count: byStatus.Cancelled?.count || 0,
    active_count: byStatus.Active?.count || 0,
    rentals_started_in_range: statusCounts.reduce((s, row) => s + row.rentedInRange, 0),
    gross_all_time: grossAllTime,
    collection_rate: grossAllTime > 0 ? Math.round((moneyReceivedAllTime / grossAllTime) * 100) : 100,
    trend: [...trend.values()]
      .map((t) => ({ ...t, income: round2(t.income), expense: round2(t.expense) }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket)),
    expense_breakdown: [...expenseByCategory.entries()]
      .map(([category, amount]) => ({ category, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8),
    revenue_by_category: topN(byCategory, 8).map(([category, v]) => ({ category, amount: round2(v.revenue) })),
    top_equipment: topN(byEquipment, 10)
      .filter(([, v]) => v.revenue > 0 || v.count > 0)
      .map(([id, v]) => ({ equipment_id: id, equipment_name: equipmentById.get(id)?.name || "Unknown", revenue: round2(v.revenue), count: v.count })),
    top_customers: topN(byCustomer, 10)
      .filter(([, v]) => v.revenue > 0 || v.count > 0)
      .map(([id, v]) => ({ customer_id: id, customer_name: customerName.get(id) || "Unknown", revenue: round2(v.revenue), count: v.count })),
  };
}

// Day sheet: every rental that went out or came back in [start, end).
async function dailyActivity(req, { start_date, end_date }) {
  const scope = { accountId: req.tenant.accountId, shopId: req.tenant.shopId };
  const start = new Date(start_date);
  const end = new Date(end_date);
  const [rentals, events] = await Promise.all([
    Rental.find({ ...scope, $or: [{ rentedAt: { $gte: start, $lt: end } }, { returnedAt: { $gte: start, $lt: end } }] })
      .populate({ path: "customerId", select: "name phone", match: { accountId: scope.accountId } })
      .populate({ path: "equipmentId", select: "name", match: { accountId: scope.accountId } })
      .sort({ rentedAt: 1 })
      .lean(),
    rentalCashEvents(scope, start, end),
  ]);
  return { rentals, money_received: sumAmounts(events) };
}

// Money received (and refunded) for rentals in [start, end), newest first,
// with customer names — the "payment entries" list on the mobile reports.
async function paymentEntries(req, { start_date, end_date }) {
  const scope = { accountId: req.tenant.accountId, shopId: req.tenant.shopId };
  const events = await rentalCashEvents(scope, new Date(start_date), new Date(end_date));
  const customers = await Customer.find({ accountId: scope.accountId, _id: { $in: [...new Set(events.map((e) => String(e.customerId)))] } })
    .select("name")
    .lean();
  const names = new Map(customers.map((c) => [String(c._id), c.name]));
  return events
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 500)
    .map((e) => ({
      kind: e.kind,
      method: e.method || null,
      amount: round2(e.amount),
      date: e.date,
      rental_id: e.rentalId,
      customer_id: e.customerId,
      customer_name: names.get(String(e.customerId)) || null,
    }));
}

module.exports = { netProfit, dashboard, summary, dailyActivity, paymentEntries, rentalCashEvents, CAPITALIZED_EXPENSE_CATEGORIES };
