const Rental = require("../models/Rental");
const invoices = require("../services/invoiceService");
const { createUrlResolver } = require("../storage");
const { paginate } = require("../lib/pagination");
const { sendPdf } = require("./files");
const { wrapController } = require("../lib/http");

module.exports = wrapController({
  async list(req, res) {
    const docs = await paginate(res, req.query, {
      model: Rental,
      filter: await invoices.listFilter(req, req.query),
      build: (q) =>
        q
          .populate({ path: "customerId", select: "name phone", match: { accountId: req.tenant.accountId } })
          .populate({ path: "equipmentId", select: "name", match: { accountId: req.tenant.accountId } })
          .sort({ returnedAt: -1 })
          .lean(),
    });
    res.json(docs.map(invoices.listItemDto));
  },
  async get(req, res) {
    res.json(await invoices.getInvoice(req, req.params.rentalId, createUrlResolver(req)));
  },
  async pdf(req, res) {
    sendPdf(res, await invoices.invoicePdf(req, req.params.rentalId, createUrlResolver(req)));
  },
});
