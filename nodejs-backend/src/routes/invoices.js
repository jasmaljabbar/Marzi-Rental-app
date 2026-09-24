const c = require("../controllers/invoiceController");
const v = require("../validators/rentals");
const { tenantRouter } = require("./_helpers");
const { validate, objectId, z } = require("../lib/validate");

const params = validate({ params: z.object({ rentalId: objectId }) });
const router = tenantRouter();
router.get("/", validate({ query: v.invoiceQuery }), c.list);
router.get("/:rentalId", params, c.get);
router.get("/:rentalId/pdf", params, c.pdf);

module.exports = router;
