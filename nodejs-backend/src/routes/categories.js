const c = require("../controllers/categoryController");
const v = require("../validators/catalog");
const { tenantRouter } = require("./_helpers");
const { adminOnly } = require("../middleware/rbac");
const { validate, idParams } = require("../lib/validate");

const router = tenantRouter();
router.get("/", validate({ query: v.listQuery }), c.list);
router.post("/", adminOnly, validate({ body: v.categoryCreate }), c.create);
router.post("/reorder", adminOnly, validate({ body: v.categoryReorder }), c.reorder);
router.put("/:id", adminOnly, validate({ params: idParams, body: v.categoryUpdate }), c.update);
router.delete("/:id", adminOnly, validate({ params: idParams }), c.remove);
router.post("/:id/archive", adminOnly, validate({ params: idParams }), c.archive);
router.post("/:id/restore", adminOnly, validate({ params: idParams }), c.restore);

module.exports = router;
