const c = require("../controllers/reservationController");
const v = require("../validators/catalog");
const { tenantRouter } = require("./_helpers");
const { validate, idParams, objectId, z } = require("../lib/validate");

const router = tenantRouter();
router.get("/notices", c.notices);
router.post("/notices/:id/ack", validate({ params: idParams }), c.ackNotice);
router.get("/", validate({ query: z.object({ customer_id: objectId.optional() }) }), c.list);
router.post("/", validate({ body: v.reservation }), c.upsert);
router.delete("/customer/:customerId", validate({ params: z.object({ customerId: objectId }) }), c.clearForCustomer);
router.post("/:id/transfer", validate({ params: idParams, body: v.reservationTransfer }), c.transfer);
router.delete("/:id", validate({ params: idParams }), c.remove);

module.exports = router;
