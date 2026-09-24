const Expense = require("../models/Expense");
const expenses = require("../services/expenseService");
const { expenseDto, recurringExpenseDto } = require("../dto");
const { createUrlResolver } = require("../storage");
const { paginate } = require("../lib/pagination");
const { wrapController } = require("../lib/http");

module.exports = wrapController({
  async list(req, res) {
    await expenses.generateDueRecurringExpenses(req);
    const docs = await paginate(res, req.query, {
      model: Expense,
      filter: expenses.listFilter(req, req.query),
      build: (q) => q.sort({ date: -1 }).lean(),
    });
    const files = createUrlResolver(req);
    res.json(docs.map((e) => expenseDto(e, files)));
  },
  async create(req, res) {
    res.status(201).json(expenseDto(await expenses.createExpense(req, req.body), createUrlResolver(req)));
  },
  async update(req, res) {
    res.json(expenseDto(await expenses.updateExpense(req, req.params.id, req.body), createUrlResolver(req)));
  },
  async remove(req, res) {
    await expenses.deleteExpense(req, req.params.id);
    res.json({ message: "Expense deleted successfully." });
  },
  async archive(req, res) {
    res.json(expenseDto(await expenses.setArchived(req, req.params.id, true), createUrlResolver(req)));
  },
  async restore(req, res) {
    res.json(expenseDto(await expenses.setArchived(req, req.params.id, false), createUrlResolver(req)));
  },
  async listRecurring(req, res) {
    res.json((await expenses.listRecurring(req)).map(recurringExpenseDto));
  },
  async createRecurring(req, res) {
    res.status(201).json(recurringExpenseDto(await expenses.createRecurring(req, req.body)));
  },
  async updateRecurring(req, res) {
    res.json(recurringExpenseDto(await expenses.updateRecurring(req, req.params.id, req.body)));
  },
  async removeRecurring(req, res) {
    await expenses.deleteRecurring(req, req.params.id);
    res.json({ message: "Recurring expense deleted successfully." });
  },
});
