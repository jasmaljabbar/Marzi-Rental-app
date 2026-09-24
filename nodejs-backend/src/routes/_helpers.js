const { Router } = require("express");
const { authenticate } = require("../middleware/auth");
const { requireTenant } = require("../middleware/tenant");
const { requireWritableSubscription } = require("../middleware/subscription");

// Router for business data: signed in, resolved to one business and shop,
// and writes blocked while the subscription is lapsed.
function tenantRouter({ gateWrites = true } = {}) {
  const router = Router();
  router.use(authenticate, requireTenant);
  if (gateWrites) router.use(requireWritableSubscription);
  return router;
}

module.exports = { tenantRouter };
