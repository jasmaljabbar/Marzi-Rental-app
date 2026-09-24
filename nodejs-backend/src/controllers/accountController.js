const accountService = require("../services/accountService");
const { companyDto, planDto, subscriptionDto } = require("../dto");
const { createUrlResolver } = require("../storage");
const { wrapController } = require("../lib/http");

module.exports = wrapController({
  async me(req, res) {
    res.json({
      id: req.account._id,
      company_name: req.account.companyName,
      business_code: req.account.slug || null,
      currency: req.account.currency,
      created_at: req.account.createdAt,
      subscription: subscriptionDto(req.subscription),
      plan: planDto(req.plan),
    });
  },
  async usage(req, res) {
    res.json(await accountService.usage(req));
  },
  async getCompany(req, res) {
    res.json(companyDto(req.account, createUrlResolver(req)));
  },
  async updateCompany(req, res) {
    res.json(companyDto(await accountService.updateCompany(req, req.body), createUrlResolver(req)));
  },
});
