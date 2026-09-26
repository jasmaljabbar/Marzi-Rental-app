const Shop = require("../models/Shop");
const { unchangedPhone } = require("../middleware/unchangedPhone");
const c = require("../controllers/shopController");
const v = require("../validators/catalog");
const { tenantRouter } = require("./_helpers");
const { adminOnly } = require("../middleware/rbac");
const { enforceLimit } = require("../middleware/subscription");
const { validate, idParams } = require("../lib/validate");

const router = tenantRouter();
router.get("/", c.list);
router.get("/:id/summary", validate({ params: idParams }), c.summary);
router.post("/", adminOnly, enforceLimit("shops"), validate({ body: v.shopCreate }), c.create);
router.put("/:id", adminOnly, validate({ params: idParams }), unchangedPhone(Shop), validate({ body: v.shopUpdate }), c.update);
router.delete("/:id", adminOnly, validate({ params: idParams }), c.remove);

module.exports = router;
