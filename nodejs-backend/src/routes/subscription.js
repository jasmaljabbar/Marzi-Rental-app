const c = require("../controllers/subscriptionController");
const { tenantRouter } = require("./_helpers");
const { adminOnly } = require("../middleware/rbac");
const { validate, z } = require("../lib/validate");

// Billing must keep working while a subscription is lapsed, so writes here
// are not gated.
const router = tenantRouter({ gateWrites: false });
router.get("/", c.get);
router.get("/invoices", adminOnly, c.invoices);
router.post("/checkout", adminOnly, validate({ body: z.object({ plan_key: z.string().min(1).max(40) }) }), c.checkout);
router.post("/portal", adminOnly, c.portal);
router.post("/cancel", adminOnly, c.cancel);

module.exports = router;
