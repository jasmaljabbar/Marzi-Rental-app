function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Case-insensitive "contains" search that is safe against regex injection and
// bounded in length so a pathological input can't cause slow scans.
function containsRegex(value) {
  return { $regex: escapeRegex(String(value).slice(0, 100)), $options: "i" };
}

// Comparison key for names that must be unique case-insensitively.
function nameKey(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

// Digits only, keeping a leading "+" — so "+91 98765-43210" and "+919876543210"
// compare equal. Used for duplicate detection, never for display.
function normalizePhone(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  return raw.startsWith("+") ? `+${digits}` : digits;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

module.exports = { escapeRegex, containsRegex, nameKey, normalizePhone, slugify };
