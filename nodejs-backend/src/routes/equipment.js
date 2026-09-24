const c = require("../controllers/equipmentController");
const v = require("../validators/catalog");
const { tenantRouter } = require("./_helpers");
const { adminOnly } = require("../middleware/rbac");
const { enforceLimit, requireFeature } = require("../middleware/subscription");
const { validate, idParams } = require("../lib/validate");

const router = tenantRouter();
router.get("/", validate({ query: v.equipmentList }), c.list);
router.get("/sales/summary", adminOnly, validate({ query: v.salesSummaryQuery }), c.salesSummary);
router.get("/sales", adminOnly, validate({ query: v.salesQuery }), c.listSales);
router.post("/sales/:id/payment", adminOnly, validate({ params: idParams, body: v.salePayment }), c.salePayment);
router.post("/maintenance", requireFeature("maintenance"), validate({ body: v.maintenance }), c.maintenance);
router.get("/:id", validate({ params: idParams }), c.get);
router.post("/", adminOnly, enforceLimit("equipment"), validate({ body: v.equipmentCreate }), c.create);
router.put("/:id", adminOnly, validate({ params: idParams, body: v.equipmentUpdate }), c.update);
router.delete("/:id", adminOnly, validate({ params: idParams }), c.remove);
router.post("/:id/archive", adminOnly, validate({ params: idParams }), c.archive);
router.post("/:id/restore", adminOnly, validate({ params: idParams }), c.restore);
router.post("/:id/duplicate", adminOnly, enforceLimit("equipment"), validate({ params: idParams }), c.duplicate);
router.post("/:id/stock", validate({ params: idParams, body: v.addStock }), c.addStock);
router.post("/:id/scrap", adminOnly, validate({ params: idParams, body: v.scrap }), c.scrap);
router.post("/:id/sell", adminOnly, validate({ params: idParams, body: v.sell }), c.sell);

module.exports = router;
