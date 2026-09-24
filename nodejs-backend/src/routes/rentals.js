const c = require("../controllers/rentalController");
const v = require("../validators/rentals");
const { tenantRouter } = require("./_helpers");
const { adminOnly } = require("../middleware/rbac");
const { enforceLimit } = require("../middleware/subscription");
const { validate, idParams } = require("../lib/validate");

const router = tenantRouter();
router.get("/history", validate({ query: v.historyQuery }), c.history);
router.get("/", validate({ query: v.listQuery }), c.list);
router.post("/", enforceLimit("activeRentalsThisMonth"), validate({ body: v.createSingle }), c.create);
router.post(
  "/bulk",
  validate({ body: v.createBulk }),
  enforceLimit("activeRentalsThisMonth", { countNew: (req) => new Set(req.body.items.map((i) => i.equipment_id)).size }),
  c.createBulk
);
router.post("/return/preview", validate({ body: v.batchReturn }), c.previewReturn);
router.post("/return", validate({ body: v.batchReturn }), c.batchReturn);
router.get("/:id", validate({ params: idParams }), c.get);
router.get("/:id/payments", validate({ params: idParams }), c.payments);
router.post("/:id/complete", validate({ params: idParams, body: v.complete }), c.complete);
router.post("/:id/payment", validate({ params: idParams, body: v.payment }), c.payment);
router.put("/:id", validate({ params: idParams, body: v.updateActive }), c.update);
router.post("/:id/cancel", validate({ params: idParams, body: v.cancel }), c.cancel);
router.delete("/:id", adminOnly, validate({ params: idParams }), c.remove);

module.exports = router;
