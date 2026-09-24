const c = require("../controllers/reportController");
const v = require("../validators/rentals");
const { tenantRouter } = require("./_helpers");
const { adminOnly } = require("../middleware/rbac");
const { requireFeature } = require("../middleware/subscription");
const { validate, z } = require("../lib/validate");

const router = tenantRouter();
router.get("/dashboard", validate({ query: z.object({ tz: z.coerce.number().int().min(-840).max(840).optional() }) }), c.dashboard);
router.get("/daily", validate({ query: v.rangeQuery }), c.daily);
router.get("/payments", adminOnly, validate({ query: v.rangeQuery }), c.payments);
router.get("/summary", adminOnly, requireFeature("analytics"), validate({ query: v.rangeQuery }), c.summary);
router.get("/net-profit", adminOnly, requireFeature("advancedReports"), validate({ query: v.rangeQuery }), c.netProfit);

module.exports = router;
