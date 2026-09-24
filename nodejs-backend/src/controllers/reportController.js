const reports = require("../services/reportService");
const Category = require("../models/Category");
const Customer = require("../models/Customer");
const Equipment = require("../models/Equipment");
const Rental = require("../models/Rental");
const Expense = require("../models/Expense");
const { rentalDto } = require("../dto");
const { createUrlResolver } = require("../storage");
const { wrapController } = require("../lib/http");

module.exports = wrapController({
  async netProfit(req, res) {
    res.json(await reports.netProfit(req, req.query));
  },
  async dashboard(req, res) {
    const data = await reports.dashboard(req, { tz: Number(req.query.tz) || 0 });
    const files = createUrlResolver(req);
    res.json({ ...data, alerts: data.alerts.map((a) => ({ rental: rentalDto(a.rental, files), days_until_due: a.days_until_due })) });
  },
  async summary(req, res) {
    res.json(await reports.summary(req, req.query));
  },
  // Record counts for the mobile app's status panel, scoped to the active shop.
  async stats(req, res) {
    const scope = { accountId: req.tenant.accountId, shopId: req.tenant.shopId };
    const [categoryCount, customerCount, equipmentCount, activeRentalCount, rentalHistoryCount, expenseCount] = await Promise.all([
      Category.countDocuments(scope),
      Customer.countDocuments(scope),
      Equipment.countDocuments(scope),
      Rental.countDocuments({ ...scope, status: "Active" }),
      Rental.countDocuments(scope),
      Expense.countDocuments(scope),
    ]);
    res.json({
      mode: "cloud-connected",
      storage: "MongoDB",
      categoryCount,
      customerCount,
      equipmentCount,
      activeRentalCount,
      rentalHistoryCount,
      expenseCount,
      totalRecords: categoryCount + customerCount + equipmentCount + rentalHistoryCount + expenseCount,
      lastCheckedAt: new Date().toISOString(),
    });
  },
  async payments(req, res) {
    res.json(await reports.paymentEntries(req, req.query));
  },
  async daily(req, res) {
    const data = await reports.dailyActivity(req, req.query);
    res.json({ rentals: data.rentals.map((r) => rentalDto(r)), money_received: data.money_received });
  },
});
