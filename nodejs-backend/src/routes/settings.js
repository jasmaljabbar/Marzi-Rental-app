const c = require("../controllers/settingController");
const v = require("../validators/catalog");
const { tenantRouter } = require("./_helpers");
const { adminOnly } = require("../middleware/rbac");
const { requireFeature } = require("../middleware/subscription");
const { validate } = require("../lib/validate");

// Settings keys that map to a plan feature.
const FEATURE_GATED_KEYS = { qr_code: "paymentQrCode" };
function gateFeature(req, res, next) {
  const feature = FEATURE_GATED_KEYS[req.params.key];
  return feature ? requireFeature(feature)(req, res, next) : next();
}

const router = tenantRouter();
router.get("/", c.list);
router.get("/:key", validate({ params: v.settingKey }), c.get);
router.put("/:key", adminOnly, validate({ params: v.settingKey, body: v.settingValue }), gateFeature, c.update);

module.exports = router;
