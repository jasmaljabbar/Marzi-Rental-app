// Best-effort strip-to-digits (same approach as the mobile app's support
// contact link in AccountStatusScreen.tsx), not a validated phone number —
// there's no country-code field on Customer, so this assumes the stored
// phone string already includes whatever wa.me needs.
export function waLink(phone: string, message?: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
