const InventoryTransaction = require("../models/InventoryTransaction");
const inventory = require("../services/inventoryService");
const { inventoryTransactionDto } = require("../dto");
const { shopFilter } = require("../lib/tenantScope");
const { paginate } = require("../lib/pagination");
const { wrapController } = require("../lib/http");

module.exports = wrapController({
  async transactions(req, res) {
    const filter = shopFilter(req, req.query.equipment_id ? { equipmentId: req.query.equipment_id } : {});
    const docs = await paginate(res, req.query, { model: InventoryTransaction, filter, build: (q) => q.sort({ createdAt: -1 }).lean() });
    res.json(docs.map(inventoryTransactionDto));
  },
  async summary(req, res) {
    res.json(await inventory.stockCostSummary(req));
  },
});
