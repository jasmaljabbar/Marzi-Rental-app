const { syncFields } = require("../lib/sync");
const Category = require("../models/Category");
const Equipment = require("../models/Equipment");
const { shopFilter, createScope, findOwned } = require("../lib/tenantScope");
const { badRequest, conflict } = require("../lib/errors");
const { nameKey } = require("../lib/text");

async function createCategory(req, { name, icon }) {
  const last = await Category.findOne(shopFilter(req)).sort({ sortOrder: -1 }).select("sortOrder").lean();
  const category = await Category.create({
    ...createScope(req),
    ...syncFields(req),
    name,
    nameKey: nameKey(name),
    icon: icon || null,
    sortOrder: (last?.sortOrder ?? -1) + 1,
  });
  return category.toObject();
}

async function updateCategory(req, id, { name, icon }) {
  const category = await findOwned(Category, id, req, { label: "Category" });
  if (name !== undefined) {
    category.name = name;
    category.nameKey = nameKey(name);
  }
  if (icon !== undefined) category.icon = icon;
  await category.save();
  return category.toObject();
}

async function reorderCategories(req, orderedIds) {
  const unique = [...new Set(orderedIds)];
  const found = await Category.countDocuments(shopFilter(req, { _id: { $in: unique } }));
  if (found !== unique.length) throw badRequest("One or more categories were not found.", "NOT_FOUND");
  await Category.bulkWrite(
    unique.map((id, index) => ({
      updateOne: { filter: shopFilter(req, { _id: id }), update: { $set: { sortOrder: index } } },
    }))
  );
}

async function deleteCategory(req, id) {
  const category = await findOwned(Category, id, req, { label: "Category" });
  const linked = await Equipment.exists({ accountId: req.tenant.accountId, categoryId: category._id });
  if (linked) throw conflict("Cannot delete category: equipment is assigned to it. Archive it instead.", "CATEGORY_IN_USE");
  await Category.deleteOne({ _id: category._id, accountId: req.tenant.accountId });
}

async function setArchived(req, id, archived) {
  const category = await findOwned(Category, id, req, { label: "Category" });
  category.isArchived = archived;
  category.archivedAt = archived ? new Date() : null;
  try {
    await category.save();
  } catch (err) {
    if (err.code === 11000) {
      throw conflict("Cannot restore: another category already uses this name. Rename one of them first.", "DUPLICATE");
    }
    throw err;
  }
  return category.toObject();
}

module.exports = { createCategory, updateCategory, reorderCategories, deleteCategory, setArchived };
