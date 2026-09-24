const c = require("../controllers/inventoryController");
const { tenantRouter } = require("./_helpers");
const { validate, objectId, pageQuery, z } = require("../lib/validate");

const router = tenantRouter();
router.get("/transactions", validate({ query: z.object({ ...pageQuery, equipment_id: objectId.optional() }) }), c.transactions);
router.get("/summary", c.summary);

module.exports = router;
