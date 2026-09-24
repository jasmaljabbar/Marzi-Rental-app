// Ported from mobile-app/src/utils/format.ts to keep money/date formatting
// and the rental day-count rule identical across both clients.

// Mirrors nodejs-backend/src/config/currencies.js — kept in sync manually,
// same as the rest of this file is "ported verbatim" rather than shared via
// a package (there's no shared package between the backend/mobile/web
// projects in this repo).
const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED ",
  SAR: "SAR ",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  MYR: "RM",
  ZAR: "R",
  NGN: "₦",
};

// Module-level singleton, same pattern as tokenStorage/getActiveShopId in
// api/http.ts — CurrencyContext pushes the logged-in account's currency in
// here once it's fetched, so this plain `currency()` formatter (called from
// dozens of components) doesn't need to become a hook/context consumer.
let activeCurrency = "INR";
export function setActiveCurrency(code: string) {
  activeCurrency = code;
}

export const currency = (value: number | null | undefined) => {
  const symbol = CURRENCY_SYMBOLS[activeCurrency] ?? `${activeCurrency} `;
  return `${symbol}${Number(value || 0).toLocaleString()}`;
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

export const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

export const daysSince = (value: string) => {
  const start = new Date(value).getTime();
  const diff = Date.now() - start;
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 1);
};

// Avatar initials: "Jasmal" -> "J", "Jasmal Jabbar" -> "JJ".
export function initialsOf(name: string | null | undefined): string {
  return (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toUpperCase() ?? "")
    .join("");
}
