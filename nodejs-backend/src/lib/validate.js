const { z } = require("zod");
const mongoose = require("mongoose");
const { badRequest } = require("./errors");

// Route-level request validation. Parsed (coerced, trimmed, defaulted) values
// replace the raw ones, so services only ever see well-typed input.
function validate(schemas) {
  return (req, _res, next) => {
    for (const part of ["params", "query", "body"]) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        const issues = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
        const first = issues[0];
        const detail = first.path ? `${first.path}: ${first.message}` : first.message;
        return next(badRequest(detail, "VALIDATION_ERROR", { errors: issues }));
      }
      req[part] = result.data;
    }
    next();
  };
}

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v) && /^[a-f\d]{24}$/i.test(v), "must be a valid id");
const idParams = z.object({ id: objectId });

// Money and counts arrive as numbers from the apps but sometimes as numeric
// strings from forms; accept both, reject anything else.
const numeric = z.union([
  z.number(),
  z.string().trim().regex(/^-?(?:\d+(?:\.\d+)?|\.\d+)$/, "Enter a valid number.").transform(Number),
]).pipe(z.number().finite());
const cents = (v) => Math.abs(v * 100 - Math.round(v * 100)) <= Number.EPSILON * Math.max(1, Math.abs(v * 100)) * 2;
const money = numeric.pipe(z.number().min(0, "Amount must be zero or more.").max(1e10)).refine(cents, "Use at most 2 decimal places.");
const signedMoney = numeric.pipe(z.number().max(1e10).min(-1e10)).refine(cents, "Use at most 2 decimal places.");
const quantity = numeric.pipe(z.number().int("Quantity must be a whole number.").min(1, "Quantity must be at least 1.").max(100000));
const optionalText = (max) => z.string().trim().max(max).nullish().transform((v) => (v === "" ? null : v));
const requiredText = (max) => z.string({ error: "is required" }).trim().min(1, "is required").max(max);
const email = z.preprocess((v) => typeof v === "string" ? v.trim().toLowerCase() || null : v,
  z.string().email("Enter a valid email address.").max(200).nullish());
const dateInput = z.union([z.date(), z.string().trim().refine((v) => {
  if (!/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(v)) return false;
  const day = new Date(v.slice(0, 10));
  return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === v.slice(0, 10) && !Number.isNaN(Date.parse(v));
}, "Enter a valid calendar date.")]).transform((v) => new Date(v));
function dateOrder(value, context, from = "date_from", to = "date_to") {
  if (value[from] && value[to] && value[to] < value[from]) {
    context.addIssue({ code: "custom", path: [to], message: "End date cannot be earlier than start date." });
  }
}
const booleanQuery = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((v) => v === true || v === "true" || v === "1");

const pageQuery = {
  page: numeric.pipe(z.number().int().min(1)).optional(),
  page_size: numeric.pipe(z.number().int().min(1)).optional(),
};

module.exports = {
  z,
  validate,
  objectId,
  idParams,
  numeric,
  email,
  dateOrder,
  money,
  signedMoney,
  quantity,
  optionalText,
  requiredText,
  dateInput,
  booleanQuery,
  pageQuery,
};
