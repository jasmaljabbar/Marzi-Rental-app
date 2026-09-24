const Customer = require("../models/Customer");
const customers = require("../services/customerService");
const invoices = require("../services/invoiceService");
const { customerDto } = require("../dto");
const { createUrlResolver } = require("../storage");
const { paginate } = require("../lib/pagination");
const { findOwned, isValidId } = require("../lib/tenantScope");
const { sendPdf } = require("./files");
const { wrapController } = require("../lib/http");

module.exports = wrapController({
  async list(req, res) {
    const docs = await paginate(res, req.query, {
      model: Customer,
      filter: customers.listFilter(req, req.query),
      build: (q) => q.sort({ name: 1 }).lean(),
    });
    const files = createUrlResolver(req);
    const stats = req.query.include_stats ? await customers.statsFor(req, docs.map((d) => d._id)) : null;
    res.json(docs.map((c) => ({ ...customerDto(c, files), ...(stats ? { stats: stats.get(String(c._id)) } : {}) })));
  },
  async byIdOrPhone(req, res) {
    const value = req.params.idOrPhone;
    const customer = isValidId(value) ? await findOwned(Customer, value, req, { label: "Customer", lean: true }) : await customers.findByPhone(req, value);
    const stats = await customers.statsFor(req, [customer._id]);
    res.json({ ...customerDto(customer, createUrlResolver(req)), stats: stats.get(String(customer._id)) });
  },
  async create(req, res) {
    res.status(201).json(customerDto(await customers.createCustomer(req, req.body), createUrlResolver(req)));
  },
  async update(req, res) {
    res.json(customerDto(await customers.updateCustomer(req, req.params.id, req.body), createUrlResolver(req)));
  },
  async remove(req, res) {
    await customers.deleteCustomer(req, req.params.id);
    res.json({ message: "Customer deleted successfully." });
  },
  async archive(req, res) {
    res.json(customerDto(await customers.setArchived(req, req.params.id, true), createUrlResolver(req)));
  },
  async restore(req, res) {
    res.json(customerDto(await customers.setArchived(req, req.params.id, false), createUrlResolver(req)));
  },
  async statementPdf(req, res) {
    sendPdf(res, await invoices.customerStatementPdf(req, req.params.id, createUrlResolver(req)));
  },
});
