// Money is stored as a JS number for compatibility with existing data, so every
// amount that is persisted or returned goes through round2() to keep values at
// cent precision and stop floating-point drift from accumulating.
function round2(value) {
  const n = Number(value) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Splits `total` across weights so the parts add up to exactly `total` at cent
// precision (the last non-zero weight absorbs the rounding remainder).
function splitByWeight(total, weights) {
  const amount = round2(total);
  const sum = weights.reduce((s, w) => s + Math.max(w, 0), 0);
  if (amount === 0 || weights.length === 0) return weights.map(() => 0);
  if (sum <= 0) {
    const even = weights.map(() => round2(amount / weights.length));
    even[even.length - 1] = round2(amount - even.slice(0, -1).reduce((s, v) => s + v, 0));
    return even;
  }
  const parts = weights.map((w) => round2((amount * Math.max(w, 0)) / sum));
  const lastIndex = weights.map((w) => w > 0).lastIndexOf(true);
  const allocated = parts.reduce((s, v) => s + v, 0);
  parts[lastIndex] = round2(parts[lastIndex] + (amount - allocated));
  return parts;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Billable days: any started 24h period counts, minimum one day.
function billableDays(from, to = new Date()) {
  const elapsed = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(Math.ceil(elapsed / MS_PER_DAY), 1);
}

module.exports = { round2, clamp, splitByWeight, billableDays, MS_PER_DAY };
