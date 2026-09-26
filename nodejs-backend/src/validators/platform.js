const { z, objectId, dateInput, numeric, money, dateOrder } = require("../lib/validate");
const { BILLING_CYCLES, LIMIT_KEYS, FEATURE_KEYS } = require("../config/planCatalog");

// partialRecord: a plan update may set any subset of the known keys.
const limits = z.partialRecord(z.enum(LIMIT_KEYS), z.number().int().min(-1)).optional();
const features = z.partialRecord(z.enum(FEATURE_KEYS), z.boolean()).optional();

const planBase = {
  key: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{2,40}$/, "must be 2-40 lowercase letters, numbers, - or _"),
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).optional(),
  price: money.refine((value) => value <= 1_000_000, "Price must be at most 1000000."),
  billing_cycle: z.enum(BILLING_CYCLES).optional(),
  currency: z.string().trim().max(10).optional(),
  trial_days: numeric.pipe(z.number().int().min(0).max(365)).nullish(),
  stripe_price_id: z.string().trim().max(120).nullish(),
  is_public: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: numeric.pipe(z.number().int()).optional(),
  limits,
  features,
};

const planCreate = z.object(planBase);
const planUpdate = z.object(planBase).partial();
const changePlan = z.object({ plan_id: objectId, start_date: dateInput.optional(), expiry_date: dateInput.nullish(), auto_renew: z.boolean().optional() }).superRefine((v, ctx) => dateOrder(v, ctx, "start_date", "expiry_date"));
const dashboardQuery = z.object({ expiring_within_days: numeric.pipe(z.number().int().min(1).max(365)).optional().default(7) });

module.exports = { planCreate, planUpdate, changePlan, dashboardQuery };
