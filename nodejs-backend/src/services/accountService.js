const Account = require("../models/Account");
const { getUsage } = require("./usageService");
const { normalizeFileRef } = require("../storage");
const { forbidden, badRequest } = require("../lib/errors");
const { featureOf, limitOf } = require("../middleware/subscription");

async function updateCompany(req, input) {
  const account = await Account.findById(req.tenant.accountId);
  const updates = {};

  if (input.logo_url !== undefined) {
    if (input.logo_url !== null && !featureOf(req.plan, "customBranding")) {
      throw forbidden("Custom branding isn't included in your current plan. Upgrade to unlock it.", "FEATURE_NOT_AVAILABLE", {
        feature: "customBranding",
      });
    }
    updates.companyLogoUrl = await normalizeFileRef(input.logo_url, { req, kinds: ["logo"], existing: [account.companyLogoUrl] });
  }
  if (input.company_name !== undefined) {
    if (!input.company_name) throw badRequest("Business name cannot be empty.", "VALIDATION_ERROR");
    updates.companyName = input.company_name;
  }
  const map = {
    address: "companyAddress",
    phone: "companyPhone",
    email: "companyEmail",
    tax_id: "taxId",
    footer_note: "invoiceFooterNote",
    default_tax_rate_percent: "defaultTaxRatePercent",
    currency: "currency",
  };
  for (const [field, target] of Object.entries(map)) {
    if (input[field] !== undefined) updates[target] = input[field];
  }
  Object.assign(account, updates);
  await account.save();
  return account.toObject();
}

async function usage(req) {
  const counts = await getUsage(req.tenant.accountId, req.tenant.accountShopIds);
  const withLimit = (used, max) => ({
    used,
    limit: max === -1 || max === undefined || max === null ? null : max,
    percent: max === -1 || max === undefined || max === null || max === 0 ? 0 : Math.min(100, Math.round((used / max) * 100)),
  });
  return {
    shops: withLimit(counts.shops, limitOf(req.plan, "maxShops")),
    equipment: withLimit(counts.equipment, limitOf(req.plan, "maxEquipment")),
    customers: withLimit(counts.customers, limitOf(req.plan, "maxCustomers")),
    staff_users: withLimit(counts.staffUsers, limitOf(req.plan, "maxStaffUsers")),
    active_rentals_this_month: withLimit(counts.activeRentalsThisMonth, limitOf(req.plan, "maxActiveRentalsPerMonth")),
  };
}

module.exports = { updateCompany, usage };
