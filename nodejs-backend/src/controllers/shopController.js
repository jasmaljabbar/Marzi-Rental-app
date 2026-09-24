const shops = require("../services/shopService");
const { shopDto } = require("../dto");
const { wrapController } = require("../lib/http");

module.exports = wrapController({
  async list(req, res) {
    res.json((await shops.listShops(req)).map(shopDto));
  },
  async create(req, res) {
    res.status(201).json(shopDto(await shops.createShop(req, req.body)));
  },
  async update(req, res) {
    res.json(shopDto(await shops.updateShop(req, req.params.id, req.body)));
  },
  async remove(req, res) {
    await shops.deleteShop(req, req.params.id);
    res.json({ message: "Shop deleted successfully." });
  },
  async summary(req, res) {
    res.json(await shops.shopSummary(req, req.params.id));
  },
});
