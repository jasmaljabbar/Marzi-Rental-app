const { z, objectId, money, quantity, optionalText, dateInput, booleanQuery, pageQuery } = require("../lib/validate");
const { paymentMethod } = require("./catalog");

const expectedDate = dateInput.nullish();

const createSingle = z.object({
  customer_id: objectId,
  equipment_id: objectId,
  quantity: quantity.optional().default(1),
  expected_return_date: expectedDate,
  advance_amount: money.optional(),
  remark: optionalText(1000),
  payment_method: paymentMethod,
});

const createBulk = z.object({
  customer_id: objectId,
  items: z.array(z.object({ equipment_id: objectId, quantity: quantity.optional().default(1) })).min(1, "must include at least one item").max(50),
  expected_return_date: expectedDate,
  advance_amount: money.optional(),
  remark: optionalText(1000),
  payment_method: paymentMethod,
});

const updateActive = z.object({
  expected_return_date: expectedDate,
  advance_amount: money.optional(),
  remark: optionalText(1000),
  payment_method: paymentMethod,
});

const cancel = z.object({ refund_advance: z.boolean().optional(), payment_method: paymentMethod });

const damage = z.object({
  rental_id: objectId,
  amount: money.optional().default(0),
  damaged_quantity: z.coerce.number().int().min(0).max(100000).optional(),
  photos: z.array(z.string().max(2000)).max(6).optional(),
  remark: optionalText(1000),
});

const returnFields = {
  discount_amount: money.optional(),
  late_fee_amount: money.optional(),
  damage_amount: money.optional(),
  damages: z.array(damage).max(50).optional(),
  tax_rate_percent: z.coerce.number().min(0).max(100).optional(),
  amount_paid: money.optional(),
  due_date: dateInput.nullish(),
  payment_method: paymentMethod,
};

const batchReturn = z.object({ rental_ids: z.array(objectId).min(1, "must include at least one rental").max(50), ...returnFields });

// The original single-rental completion body.
const complete = z.object({
  discount_amount: money.optional(),
  amount_paid_on_return: money.optional(),
  late_fee_amount: money.optional(),
  damage_amount: money.optional(),
  damage_quantity: z.coerce.number().int().min(0).optional(),
  damage_photos: z.array(z.string().max(2000)).max(6).optional(),
  damage_remark: optionalText(1000),
  tax_rate_percent: z.coerce.number().min(0).max(100).optional(),
  due_date: dateInput.nullish(),
  payment_method: paymentMethod,
});

const payment = z.object({
  amount_paid: money.optional().default(0),
  discount_amount: money.optional().default(0),
  due_date: dateInput.nullish(),
  payment_method: paymentMethod,
});

const listQuery = z.object({
  ...pageQuery,
  status: z.enum(["Active", "Completed", "Cancelled"]).optional(),
  date_from: dateInput.optional(),
  date_to: dateInput.optional(),
  customer_id: objectId.optional(),
  order_id: z.string().max(64).optional(),
  search: z.string().max(100).optional(),
});

const historyQuery = z.object({
  ...pageQuery,
  include_cancelled: booleanQuery.optional(),
  date_from: dateInput.optional(),
  date_to: dateInput.optional(),
  customer_id: objectId.optional(),
  search: z.string().max(100).optional(),
});

const invoiceQuery = z.object({
  ...pageQuery,
  search: z.string().max(100).optional(),
  payment_status: z.enum(["Pending", "Partial", "Paid"]).optional(),
  date_from: dateInput.optional(),
  date_to: dateInput.optional(),
  customer_id: objectId.optional(),
});

const rangeQuery = z.object({
  start_date: dateInput,
  end_date: dateInput,
  tz: z.coerce.number().int().min(-840).max(840).optional().default(0),
});

module.exports = { createSingle, createBulk, updateActive, cancel, batchReturn, complete, payment, listQuery, historyQuery, invoiceQuery, rangeQuery };
