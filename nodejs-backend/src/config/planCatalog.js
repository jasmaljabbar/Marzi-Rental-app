// Single source of truth for every limit/feature key a Plan can define.
// Adding a new tier of enforcement (a new limit or feature) should mean
// adding one entry here — the Plan schema (Map-typed), the platform admin's
// Plan form, and every tenant-facing usage/feature display all read from
// this registry instead of hardcoding key lists, so nothing else needs to
// change to introduce a new key.
const LIMIT_DEFINITIONS = [
  { key: "maxShops", resource: "shops", label: "Shops", unit: "shops", description: "Active shop locations.", default: 1 },
  { key: "maxEquipment", resource: "equipment", label: "Equipment", unit: "items", description: "Non-archived equipment items.", default: 50 },
  { key: "maxCustomers", resource: "customers", label: "Customers", unit: "customers", description: "Non-archived customer records.", default: 200 },
  { key: "maxStaffUsers", resource: "staffUsers", label: "Team members", unit: "users", description: "Admin and staff logins (the owner is not counted).", default: 2 },
  { key: "maxActiveRentalsPerMonth", resource: "activeRentalsThisMonth", label: "Rentals per month", unit: "rentals", description: "New rentals created this calendar month.", default: 100 },
];

const FEATURE_DEFINITIONS = [
  { key: "advancedReports", label: "Advanced reports", description: "Net-profit and deeper analytics reporting.", default: false },
  { key: "analytics", label: "Analytics & reports module", description: "Access to the Reports section at all.", default: true },
  { key: "maintenance", label: "Maintenance tracking", description: "Report damage/repair against equipment.", default: true },
  { key: "paymentQrCode", label: "Payment QR code", description: "Show a scan-to-pay QR code on invoices/rentals.", default: true },
  { key: "customBranding", label: "Custom branding", description: "Upload a company logo on invoices.", default: false },
  { key: "apiAccess", label: "API access", description: "Reserved for a future public API.", default: false },
  { key: "prioritySupport", label: "Priority support", description: "Priority support queue.", default: false },
];

const BILLING_CYCLES = ["monthly", "yearly"];

const LIMIT_KEYS = LIMIT_DEFINITIONS.map((d) => d.key);
const FEATURE_KEYS = FEATURE_DEFINITIONS.map((d) => d.key);
const LIMIT_KEY_BY_RESOURCE = Object.fromEntries(LIMIT_DEFINITIONS.map((d) => [d.resource, d.key]));

function defaultLimitsMap() {
  return new Map(LIMIT_DEFINITIONS.map((d) => [d.key, d.default]));
}

function defaultFeaturesMap() {
  return new Map(FEATURE_DEFINITIONS.map((d) => [d.key, d.default]));
}

module.exports = {
  LIMIT_DEFINITIONS,
  FEATURE_DEFINITIONS,
  BILLING_CYCLES,
  LIMIT_KEYS,
  FEATURE_KEYS,
  LIMIT_KEY_BY_RESOURCE,
  defaultLimitsMap,
  defaultFeaturesMap,
};
