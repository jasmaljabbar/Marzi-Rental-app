const Rental = require("../models/Rental");
const rentals = require("../services/rentalService");
const { rentalDto, paymentDto } = require("../dto");
const { createUrlResolver } = require("../storage");
const { paginate } = require("../lib/pagination");
const { wrapController } = require("../lib/http");

async function listWith(req, res, filter, sort) {
  const docs = await paginate(res, req.query, {
    model: Rental,
    filter,
    build: (q) => rentals.withParties(q, req).sort(sort).lean(),
  });
  const files = createUrlResolver(req);
  res.json(docs.map((r) => rentalDto(r, files)));
}

// Re-reads saved rentals with customer/equipment names for the response.
async function populated(req, docs) {
  const ids = docs.map((d) => d._id);
  const rows = await rentals.withParties(Rental.find({ accountId: req.tenant.accountId, _id: { $in: ids } }), req).lean();
  const byId = new Map(rows.map((r) => [String(r._id), r]));
  const files = createUrlResolver(req);
  return ids.map((id) => rentalDto(byId.get(String(id)), files));
}

module.exports = wrapController({
  async list(req, res) {
    await listWith(req, res, await rentals.listFilter(req, req.query), { rentedAt: -1 });
  },
  async history(req, res) {
    await listWith(req, res, await rentals.historyFilter(req, req.query), { returnedAt: -1 });
  },
  async get(req, res) {
    res.json(rentalDto(await rentals.getRental(req, req.params.id), createUrlResolver(req)));
  },
  async create(req, res) {
    const { equipment_id, quantity, ...rest } = req.body;
    const [rental] = await rentals.createRentals(req, { ...rest, items: [{ equipment_id, quantity }] });
    res.status(201).json((await populated(req, [rental]))[0]);
  },
  async createBulk(req, res) {
    res.status(201).json(await populated(req, await rentals.createRentals(req, req.body)));
  },
  async update(req, res) {
    res.json((await populated(req, [await rentals.updateActiveRental(req, req.params.id, req.body)]))[0]);
  },
  async cancel(req, res) {
    res.json((await populated(req, [await rentals.cancelRental(req, req.params.id, req.body)]))[0]);
  },
  async remove(req, res) {
    await rentals.deleteRental(req, req.params.id);
    res.json({ message: "Rental deleted successfully." });
  },
  async complete(req, res) {
    const b = req.body;
    const reported = (b.damage_amount || 0) > 0 || (b.damage_photos || []).length > 0 || (b.damage_quantity || 0) > 0;
    const result = await rentals.completeReturn(req, {
      rental_ids: [req.params.id],
      discount_amount: b.discount_amount,
      amount_paid: b.amount_paid_on_return,
      late_fee_amount: b.late_fee_amount,
      tax_rate_percent: b.tax_rate_percent,
      due_date: b.due_date,
      payment_method: b.payment_method,
      damages: reported
        ? [{ rental_id: req.params.id, amount: b.damage_amount || 0, photos: b.damage_photos, remark: b.damage_remark, damaged_quantity: b.damage_quantity }]
        : [],
    });
    res.json((await populated(req, result.rentals))[0]);
  },
  async previewReturn(req, res) {
    res.json(await rentals.previewReturn(req, req.body));
  },
  async batchReturn(req, res) {
    const result = await rentals.completeReturn(req, req.body);
    res.json({ rentals: await populated(req, result.rentals), summary: result.summary });
  },
  async payment(req, res) {
    res.json((await populated(req, [await rentals.recordPayment(req, req.params.id, req.body)]))[0]);
  },
  async payments(req, res) {
    res.json((await rentals.listPayments(req, req.params.id)).map(paymentDto));
  },
});
