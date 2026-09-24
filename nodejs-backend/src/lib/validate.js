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
const money = z.coerce.number({ error: "must be a number" }).finite().min(0, "must be zero or more").max(1e10);
const signedMoney = z.coerce.number({ error: "must be a number" }).finite().max(1e10).min(-1e10);
const quantity = z.coerce.number({ error: "must be a number" }).int("must be a whole number").min(1, "must be at least 1").max(100000);
const optionalText = (max) => z.string().trim().max(max).nullish().transform((v) => (v === "" ? null : v));
const requiredText = (max) => z.string({ error: "is required" }).trim().min(1, "is required").max(max);
const dateInput = z
  .union([z.string(), z.date()])
  .transform((v) => new Date(v))
  .refine((d) => !Number.isNaN(d.getTime()), "must be a valid date");
const booleanQuery = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((v) => v === true || v === "true" || v === "1");

const pageQuery = {
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.coerce.number().int().min(1).optional(),
};

module.exports = {
  z,
  validate,
  objectId,
  idParams,
  money,
  signedMoney,
  quantity,
  optionalText,
  requiredText,
  dateInput,
  booleanQuery,
  pageQuery,
};
