const { Router } = require("express");
const c = require("../controllers/platformController");
const v = require("../validators/platform");
const { authenticate, requirePlatformAdmin } = require("../middleware/auth");
const { validate, idParams } = require("../lib/validate");

const router = Router();
router.use(authenticate, requirePlatformAdmin);
router.get("/dashboard", validate({ query: v.dashboardQuery }), c.dashboard);
router.get("/plans", c.listPlans);
router.post("/plans", validate({ body: v.planCreate }), c.createPlan);
router.put("/plans/:id", validate({ params: idParams, body: v.planUpdate }), c.updatePlan);
router.delete("/plans/:id", validate({ params: idParams }), c.deletePlan);
router.get("/accounts", c.listAccounts);
router.get("/accounts/:id", validate({ params: idParams }), c.getAccount);
router.put("/accounts/:id/plan", validate({ params: idParams, body: v.changePlan }), c.changePlan);
router.post("/accounts/:id/suspend", validate({ params: idParams }), c.suspend);
router.post("/accounts/:id/reactivate", validate({ params: idParams }), c.reactivate);
router.delete("/accounts/:id", validate({ params: idParams }), c.deleteAccount);

module.exports = router;
