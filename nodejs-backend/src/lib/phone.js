const { parsePhoneNumberFromString } = require("libphonenumber-js/max");
const { z } = require("zod");

// Existing clients submit national Indian numbers. New clients send E.164.
// Country is explicit in E.164; never strip a calling code from a local input.
function parsePhone(value, country = "IN") {
  if (typeof value !== "string" || !/^\+?[0-9 ()-]+$/.test(value.trim())) return null;
  const raw = value.trim();
  if (!raw.startsWith("+") && country === "IN" && raw.replace(/\D/g, "").length !== 10) return null;
  const phone = parsePhoneNumberFromString(raw, { defaultCountry: country, extract: false });
  if (phone?.country === "IN" && raw.startsWith("+") && raw.replace(/\D/g, "").length !== 12) return null;
  return phone?.isValid() && (!raw.startsWith("+") || phone.number.startsWith("+")) ? phone : null;
}
const phone = z.string().trim().max(40).transform((value, context) => {
  const parsed = parsePhone(value);
  if (!parsed) {
    context.addIssue({ code: "custom", message: "Enter a valid phone number with its country code (India: 10 local digits)." });
    return z.NEVER;
  }
  return parsed.number;
});
const optionalPhone = z.preprocess((v) => typeof v === "string" && !v.trim() ? null : v, phone.nullish());
// Keep reads and duplicate checks compatible with pre-E.164 Indian records.
function phoneKeys(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  const keys = [raw.startsWith("+") ? `+${digits}` : digits];
  const parsed = parsePhone(raw);
  if (parsed) {
    keys.push(parsed.number);
    if (parsed.country === "IN") keys.push(parsed.nationalNumber);
  }
  return [...new Set(keys)];
}
module.exports = { phone, optionalPhone, parsePhone, phoneKeys };
