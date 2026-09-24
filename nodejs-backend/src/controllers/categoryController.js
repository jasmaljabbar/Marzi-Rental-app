const Category = require("../models/Category");
const categories = require("../services/categoryService");
const { categoryDto } = require("../dto");
const { shopFilter } = require("../lib/tenantScope");
const { paginate } = require("../lib/pagination");
const { containsRegex } = require("../lib/text");
const { wrapController } = require("../lib/http");

module.exports = wrapController({
  async list(req, res) {
    const filter = shopFilter(req, { isArchived: req.query.include_archived ? true : { $ne: true } });
    if (req.query.search) filter.name = containsRegex(req.query.search);
    const docs = await paginate(res, req.query, { model: Category, filter, build: (q) => q.sort({ sortOrder: 1, name: 1 }).lean() });
    res.json(docs.map(categoryDto));
  },
  async create(req, res) {
    res.status(201).json(categoryDto(await categories.createCategory(req, req.body)));
  },
  async update(req, res) {
    res.json(categoryDto(await categories.updateCategory(req, req.params.id, req.body)));
  },
  async reorder(req, res) {
    await categories.reorderCategories(req, req.body.ordered_ids);
    res.json({ message: "Order updated." });
  },
  async remove(req, res) {
    await categories.deleteCategory(req, req.params.id);
    res.json({ message: "Category deleted successfully." });
  },
  async archive(req, res) {
    res.json(categoryDto(await categories.setArchived(req, req.params.id, true)));
  },
  async restore(req, res) {
    res.json(categoryDto(await categories.setArchived(req, req.params.id, false)));
  },
});
