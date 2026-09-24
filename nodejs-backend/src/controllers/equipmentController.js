const Equipment = require("../models/Equipment");
const EquipmentSale = require("../models/EquipmentSale");
const equipment = require("../services/equipmentService");
const { equipmentDto, saleDto, maintenanceDto } = require("../dto");
const { createUrlResolver } = require("../storage");
const { paginate } = require("../lib/pagination");
const { wrapController } = require("../lib/http");

async function withLogs(req, docs) {
  const logs = await equipment.logsByEquipment(req, docs.map((d) => d._id));
  const files = createUrlResolver(req);
  return docs.map((d) => equipmentDto(d, logs.get(String(d._id)) || [], files));
}

async function one(req, doc) {
  const [dto] = await withLogs(req, [doc]);
  return dto;
}

module.exports = wrapController({
  async list(req, res) {
    const docs = await paginate(res, req.query, {
      model: Equipment,
      filter: equipment.listFilter(req, req.query),
      build: (q) => q.sort({ name: 1 }).lean(),
    });
    res.json(await withLogs(req, docs));
  },
  async get(req, res) {
    const { equipment: doc, logs } = await equipment.getEquipment(req, req.params.id);
    res.json(equipmentDto(doc, logs, createUrlResolver(req)));
  },
  async create(req, res) {
    res.status(201).json(await one(req, await equipment.createEquipment(req, req.body)));
  },
  async update(req, res) {
    res.json(await one(req, await equipment.updateEquipment(req, req.params.id, req.body)));
  },
  async remove(req, res) {
    await equipment.deleteEquipment(req, req.params.id);
    res.json({ message: "Equipment deleted successfully." });
  },
  async archive(req, res) {
    res.json(await one(req, await equipment.setArchived(req, req.params.id, true)));
  },
  async restore(req, res) {
    res.json(await one(req, await equipment.setArchived(req, req.params.id, false)));
  },
  async duplicate(req, res) {
    res.status(201).json(await one(req, await equipment.duplicateEquipment(req, req.params.id)));
  },
  async addStock(req, res) {
    res.json(await one(req, await equipment.addStock(req, req.params.id, req.body)));
  },
  async scrap(req, res) {
    res.json(await one(req, await equipment.markScrap(req, req.params.id, req.body)));
  },
  async sell(req, res) {
    res.status(201).json(saleDto(await equipment.sellEquipment(req, req.params.id, req.body)));
  },
  async listSales(req, res) {
    const docs = await paginate(res, req.query, {
      model: EquipmentSale,
      filter: equipment.salesFilter(req, req.query),
      build: (q) =>
        q
          .populate({ path: "customerId", select: "name phone", match: { accountId: req.tenant.accountId } })
          .populate({ path: "equipmentId", select: "name", match: { accountId: req.tenant.accountId } })
          .sort({ soldAt: -1 })
          .lean(),
    });
    res.json(docs.map(saleDto));
  },
  async salesSummary(req, res) {
    res.json(await equipment.salesSummary(req, req.query));
  },
  async salePayment(req, res) {
    res.json(saleDto(await equipment.recordSalePayment(req, req.params.id, req.body)));
  },
  async maintenance(req, res) {
    res.status(201).json(maintenanceDto(await equipment.createMaintenance(req, req.body), createUrlResolver(req)));
  },
});
