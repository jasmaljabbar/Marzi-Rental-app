const { z, objectId, money, quantity, optionalText, requiredText, dateInput, booleanQuery, pageQuery } = require("../lib/validate");
const { CATEGORY_ICONS } = require("../config/categoryIcons");
const { CURRENCY_CODES } = require("../config/currencies");
const { PAYMENT_METHODS } = require("../models/Payment");

const fileRef = z.string().trim().max(2000);
const paymentMethod = z.enum(PAYMENT_METHODS).optional();

const categoryCreate = z.object({ name: requiredText(80), icon: z.enum(CATEGORY_ICONS).nullish() });
const categoryUpdate = z.object({ name: requiredText(80).optional(), icon: z.enum(CATEGORY_ICONS).nullish() });
const categoryReorder = z.object({ ordered_ids: z.array(objectId).min(1, "must list at least one category").max(1000) });
const listQuery = z.object({
  ...pageQuery,
  include_archived: booleanQuery.optional(),
  search: z.string().max(100).optional(),
  include_stats: booleanQuery.optional(),
});

const equipmentCreate = z.object({
  name: requiredText(120),
  description: optionalText(2000),
  stock_count: z.coerce.number().int("must be a whole number").min(0).max(1_000_000).optional(),
  damaged_count: z.coerce.number().int().min(0).optional(),
  rent_per_day: money.optional(),
  deposit_amount: money.optional(),
  purchase_price_per_unit: money.optional(),
  useful_life_years: z.coerce.number().min(0).max(100).optional(),
  category_id: objectId,
  // Payload ceiling only. The photo limit itself (4) is enforced by the
  // service, which lets items saved before the limit keep their extra photos.
  images: z.array(fileRef).max(20).optional(),
});
const equipmentUpdate = equipmentCreate.omit({ stock_count: true, damaged_count: true }).partial();
const equipmentList = listQuery.extend({ category_id: objectId.optional() });
const addStock = z.object({ quantity_added: quantity, unit_price: money.optional(), note: optionalText(500) });
const scrap = z.object({ quantity, remark: optionalText(500) });
const sell = z.object({
  customer_id: objectId,
  quantity,
  selling_price: money.optional(),
  amount_paid: money.optional(),
  remark: optionalText(1000),
  payment_method: paymentMethod,
});
const salePayment = z.object({ amount_paid: money.refine((v) => v > 0, "must be more than zero"), payment_method: paymentMethod });
const salesQuery = z.object({
  ...pageQuery,
  customer_id: objectId.optional(),
  equipment_id: objectId.optional(),
  payment_status: z.enum(["Pending", "Partial", "Paid"]).optional(),
});
const salesSummaryQuery = z.object({ start_date: dateInput.optional(), end_date: dateInput.optional() });
const maintenance = z.object({
  equipment_id: objectId,
  action: z.enum(["Damage", "Repair"], { error: 'must be "Damage" or "Repair"' }),
  quantity: quantity.optional(),
  remark: optionalText(1000),
  cost: money.optional(),
  photos: z.array(fileRef).max(6).optional(),
  rental_id: objectId.nullish(),
  customer_id: objectId.nullish(),
});

const customerCreate = z.object({
  name: requiredText(120),
  phone: requiredText(40).refine((v) => v.replace(/\D/g, "").length >= 5, "must contain at least 5 digits"),
  address: optionalText(500),
  doc_url: fileRef.nullish(),
  photo_url: fileRef.nullish(),
});
const customerUpdate = customerCreate.partial();

const expenseCreate = z.object({
  category: requiredText(80),
  amount: money,
  remark: optionalText(1000),
  payment_mode: z.enum(PAYMENT_METHODS).optional(),
  receipt_url: fileRef.nullish(),
  equipment_id: objectId.nullish(),
  date: dateInput.optional(),
});
const expenseUpdate = expenseCreate.partial();
const expenseList = listQuery.extend({ category: z.string().max(80).optional(), date_from: dateInput.optional(), date_to: dateInput.optional() });
const recurringCreate = z.object({
  category: requiredText(80),
  amount: money,
  remark: optionalText(1000),
  day_of_month: z.coerce.number().int().min(1, "must be between 1 and 28").max(28, "must be between 1 and 28"),
  equipment_id: objectId.nullish(),
});
const recurringUpdate = recurringCreate.partial().extend({ is_active: z.boolean().optional() });

const shopCreate = z.object({ name: requiredText(120), address: optionalText(500), phone: optionalText(40) });
const shopUpdate = shopCreate.partial().extend({ is_active: z.boolean().optional() });

const companyUpdate = z.object({
  company_name: requiredText(120).optional(),
  logo_url: fileRef.nullish(),
  address: optionalText(500),
  phone: optionalText(40),
  email: z.string().trim().max(200).nullish(),
  tax_id: optionalText(60),
  footer_note: optionalText(1000),
  default_tax_rate_percent: z.coerce.number().min(0).max(100).optional(),
  currency: z.enum(CURRENCY_CODES, { error: "is not a supported currency" }).optional(),
});

const settingKey = z.object({ key: z.string().regex(/^[a-z0-9_]{1,64}$/, "is not a valid setting key") });
const settingValue = z.object({ value: z.union([z.string().max(2000), z.number(), z.boolean()]).nullish() });

const reservation = z.object({ customer_id: objectId, equipment_id: objectId, quantity: quantity.optional().default(1) });
const reservationTransfer = z.object({ to_customer_id: objectId });

module.exports = {
  categoryCreate,
  categoryUpdate,
  categoryReorder,
  listQuery,
  equipmentCreate,
  equipmentUpdate,
  equipmentList,
  addStock,
  scrap,
  sell,
  salePayment,
  salesQuery,
  salesSummaryQuery,
  maintenance,
  customerCreate,
  customerUpdate,
  expenseCreate,
  expenseUpdate,
  expenseList,
  recurringCreate,
  recurringUpdate,
  shopCreate,
  shopUpdate,
  companyUpdate,
  settingKey,
  settingValue,
  reservation,
  reservationTransfer,
  paymentMethod,
};
