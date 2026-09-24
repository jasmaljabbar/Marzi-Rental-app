const Plan = require("../models/Plan");
const { planDto } = require("../dto");
const { LIMIT_DEFINITIONS, FEATURE_DEFINITIONS, BILLING_CYCLES } = require("../config/planCatalog");
const { CURRENCIES } = require("../config/currencies");
const { CATEGORY_ICONS } = require("../config/categoryIcons");
const { PAYMENT_METHODS } = require("../models/Payment");
const { wrapController } = require("../lib/http");

module.exports = wrapController({
  async plans(_req, res) {
    res.json((await Plan.find({ isPublic: true, isActive: true }).sort({ sortOrder: 1 }).lean()).map(planDto));
  },
  // Registry of plan keys, currencies, icons and payment methods, so clients
  // don't hard-code lists that must match the server.
  async catalog(_req, res) {
    res.json({
      limits: LIMIT_DEFINITIONS,
      features: FEATURE_DEFINITIONS,
      billing_cycles: BILLING_CYCLES,
      currencies: CURRENCIES,
      category_icons: CATEGORY_ICONS,
      payment_methods: PAYMENT_METHODS,
    });
  },
});
