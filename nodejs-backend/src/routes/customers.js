const c = require("../controllers/customerController");
const v = require("../validators/catalog");
const { tenantRouter } = require("./_helpers");
const { adminOnly } = require("../middleware/rbac");
const { enforceLimit } = require("../middleware/subscription");
const { validate, idParams, z } = require("../lib/validate");

const router = tenantRouter();
router.get("/", validate({ query: v.listQuery }), c.list);
router.get("/:id/statement/pdf", validate({ params: idParams }), c.statementPdf);
// A 24-hex id fetches by id; anything else is treated as a phone number.
router.get("/:idOrPhone", validate({ params: z.object({ idOrPhone: z.string().trim().min(1).max(40) }) }), c.byIdOrPhone);
router.post("/", enforceLimit("customers"), validate({ body: v.customerCreate }), c.create);
router.put("/:id", validate({ params: idParams, body: v.customerUpdate }), c.update);
router.delete("/:id", adminOnly, validate({ params: idParams }), c.remove);
router.post("/:id/archive", adminOnly, validate({ params: idParams }), c.archive);
router.post("/:id/restore", adminOnly, validate({ params: idParams }), c.restore);

module.exports = router;
