// Single source of truth for the currencies a tenant Account can operate in
// (used for the signup currency picker, the Settings currency editor, and
// resolving the symbol shown on generated invoice PDFs). Mirrored in
// web-dashboard/src/utils/format.ts, same as returnCalculations.ts/format.ts
// are already ported verbatim between the mobile app and web dashboard —
// there's no shared package between the three JS projects in this repo.
const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "AED", symbol: "AED ", label: "UAE Dirham" },
  { code: "SAR", symbol: "SAR ", label: "Saudi Riyal" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar" },
  { code: "MYR", symbol: "RM", label: "Malaysian Ringgit" },
  { code: "ZAR", symbol: "R", label: "South African Rand" },
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
];

const CURRENCY_CODES = CURRENCIES.map((c) => c.code);
const CURRENCY_SYMBOL = Object.fromEntries(CURRENCIES.map((c) => [c.code, c.symbol]));
const DEFAULT_CURRENCY = "INR";

module.exports = { CURRENCIES, CURRENCY_CODES, CURRENCY_SYMBOL, DEFAULT_CURRENCY };
