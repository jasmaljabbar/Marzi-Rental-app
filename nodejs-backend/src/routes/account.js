const Account = require("../models/Account");
const { unchangedPhone } = require("../middleware/unchangedPhone");
const c = require("../controllers/accountController");
const v = require("../validators/catalog");
const { tenantRouter } = require("./_helpers");
const { adminOnly } = require("../middleware/rbac");
const { validate } = require("../lib/validate");

const router = tenantRouter();
router.get("/me", c.me);
router.get("/usage", c.usage);
router.get("/company", c.getCompany);
router.put("/company", adminOnly, unchangedPhone(Account, { company: true }), validate({ body: v.companyUpdate }), c.updateCompany);

module.exports = router;
