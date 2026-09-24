const c = require("../controllers/reportController");
const { tenantRouter } = require("./_helpers");

const router = tenantRouter();
router.get("/", c.stats);

module.exports = router;
