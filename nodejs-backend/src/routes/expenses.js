const c = require("../controllers/expenseController");
const v = require("../validators/catalog");
const { tenantRouter } = require("./_helpers");
const { adminOnly } = require("../middleware/rbac");
const { validate, idParams } = require("../lib/validate");

const router = tenantRouter();
router.get("/recurring", c.listRecurring);
router.post("/recurring", adminOnly, validate({ body: v.recurringCreate }), c.createRecurring);
router.put("/recurring/:id", adminOnly, validate({ params: idParams, body: v.recurringUpdate }), c.updateRecurring);
router.delete("/recurring/:id", adminOnly, validate({ params: idParams }), c.removeRecurring);

router.get("/", validate({ query: v.expenseList }), c.list);
router.post("/", validate({ body: v.expenseCreate }), c.create);
router.put("/:id", adminOnly, validate({ params: idParams, body: v.expenseUpdate }), c.update);
router.delete("/:id", adminOnly, validate({ params: idParams }), c.remove);
router.post("/:id/archive", adminOnly, validate({ params: idParams }), c.archive);
router.post("/:id/restore", adminOnly, validate({ params: idParams }), c.restore);

module.exports = router;
