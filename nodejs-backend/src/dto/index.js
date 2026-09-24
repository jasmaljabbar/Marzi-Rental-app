// Response mappers: one per entity, snake_case field names (the existing API
// contract both clients depend on). Mappers that emit file URLs take the
// per-request URL resolver from storage.createUrlResolver(req).
const { round2 } = require("../lib/money");

const idOf = (value) => (value && value._id ? value._id : value) ?? null;

function userDto(u) {
  return {
    id: u._id,
    username: u.username,
    email: u.email || null,
    role: u.role,
    shop_id: u.shopId || null,
    created_at: u.createdAt,
    last_login_at: u.lastLoginAt || null,
  };
}

function shopDto(s) {
  return {
    id: s._id,
    name: s.name,
    address: s.address,
    phone: s.phone,
    is_active: s.isActive,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

function companyDto(account, files) {
  return {
    company_name: account.companyName,
    business_code: account.slug || null,
    logo_url: files.url(account.companyLogoUrl),
    address: account.companyAddress,
    phone: account.companyPhone,
    email: account.companyEmail,
    tax_id: account.taxId,
    footer_note: account.invoiceFooterNote,
    default_tax_rate_percent: account.defaultTaxRatePercent,
    currency: account.currency,
  };
}

function categoryDto(c) {
  return {
    id: c._id,
    name: c.name,
    icon: c.icon,
    sort_order: c.sortOrder,
    sync_id: c.syncId,
    shop_id: c.shopId,
    is_archived: Boolean(c.isArchived),
    archived_at: c.archivedAt || null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

function maintenanceDto(l, files) {
  return {
    id: l._id,
    equipment_id: l.equipmentId,
    action: l.action,
    quantity: l.quantity || 1,
    remark: l.remark,
    cost: l.cost,
    photos: files.urls(l.photos || []),
    rental_id: l.rentalId || null,
    customer_id: l.customerId || null,
    created_at: l.createdAt,
  };
}

function equipmentDto(e, logs, files) {
  const category = e.categoryId && e.categoryId._id ? e.categoryId : null;
  return {
    id: e._id,
    sync_id: e.syncId,
    name: e.name,
    description: e.description,
    stock_count: e.stockCount,
    damaged_count: e.damagedCount || 0,
    available_count: Math.max((e.stockCount || 0) - (e.damagedCount || 0), 0),
    rent_per_day: e.rentPerDay,
    deposit_amount: e.depositAmount || 0,
    purchase_price_per_unit: e.purchasePricePerUnit || 0,
    useful_life_years: e.usefulLifeYears,
    images: files.urls(e.images || []),
    image_thumbs: files.thumbs(e.images || []),
    category_id: idOf(e.categoryId),
    category_name: category ? category.name : undefined,
    shop_id: e.shopId,
    maintenance_logs: (logs || []).map((l) => maintenanceDto(l, files)),
    is_archived: Boolean(e.isArchived),
    archived_at: e.archivedAt || null,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}

function customerDto(c, files) {
  return {
    id: c._id,
    sync_id: c.syncId,
    name: c.name,
    phone: c.phone,
    address: c.address,
    doc_url: files.url(c.docUrl),
    photo_url: files.url(c.photoUrl),
    photo_thumb_url: files.thumb(c.photoUrl),
    shop_id: c.shopId,
    is_archived: Boolean(c.isArchived),
    archived_at: c.archivedAt || null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

// The embedded customer carries a photo thumbnail when the caller populated
// photoUrl and passed the URL resolver, so lists can show the same avatar as
// the customer screens.
function rentalDto(r, files) {
  const customer = r.customerId && r.customerId._id ? r.customerId : null;
  const equipment = r.equipmentId && r.equipmentId._id ? r.equipmentId : null;
  return {
    id: r._id,
    sync_id: r.syncId,
    order_id: r.orderId || null,
    customer_id: idOf(r.customerId),
    equipment_id: idOf(r.equipmentId),
    customer: customer
      ? {
          id: customer._id,
          name: customer.name,
          phone: customer.phone,
          ...(files ? { photo_thumb_url: files.thumb(customer.photoUrl) } : {}),
        }
      : undefined,
    equipment: equipment ? { id: equipment._id, name: equipment.name } : undefined,
    expected_return_date: r.expectedReturnDate,
    quantity: r.quantity,
    daily_rate: r.dailyRate ?? (equipment ? equipment.rentPerDay : null),
    advance_amount: r.advanceAmount,
    remark: r.remark,
    rented_at: r.rentedAt,
    returned_at: r.returnedAt,
    gross_amount: r.grossAmount ?? null,
    total_price: r.totalPrice,
    status: r.status,
    discount_amount: r.discountAmount,
    late_fee_amount: r.lateFeeAmount,
    damage_amount: r.damageAmount,
    tax_rate_percent: r.taxRatePercent,
    tax_amount: r.taxAmount,
    amount_paid_on_return: r.amountPaidOnReturn,
    refund_amount: r.refundAmount || 0,
    amount_due: r.amountDue,
    due_date: r.dueDate,
    return_revenue_amount: r.returnRevenueAmount,
    payment_status: r.paymentStatus,
    invoice_number: r.invoiceNumber,
    shop_id: r.shopId,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function paymentDto(p) {
  return {
    id: p._id,
    kind: p.kind,
    amount: round2(p.amount),
    method: p.method,
    received_at: p.receivedAt,
    customer_id: p.customerId,
    rental_id: p.rentalId,
    sale_id: p.saleId,
    order_id: p.orderId,
    note: p.note,
    created_by: p.createdBy,
  };
}

function saleDto(s) {
  const customer = s.customerId && s.customerId._id ? s.customerId : null;
  const equipment = s.equipmentId && s.equipmentId._id ? s.equipmentId : null;
  return {
    id: s._id,
    sync_id: s.syncId,
    equipment_id: idOf(s.equipmentId),
    customer_id: idOf(s.customerId),
    customer: customer ? { id: customer._id, name: customer.name, phone: customer.phone } : undefined,
    equipment: equipment ? { id: equipment._id, name: equipment.name } : undefined,
    quantity: s.quantity,
    selling_price: s.unitPrice,
    total_price: s.totalPrice,
    book_value_per_unit: s.bookValuePerUnit,
    total_book_value: s.totalBookValue,
    gain_loss: s.gainLoss,
    amount_paid: s.amountPaid,
    amount_due: s.amountDue,
    payment_status: s.paymentStatus,
    sold_at: s.soldAt,
    remark: s.remark,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

function expenseDto(e, files) {
  return {
    id: e._id,
    category: e.category,
    amount: e.amount,
    remark: e.remark,
    payment_mode: e.paymentMode,
    receipt_url: files.url(e.receiptUrl),
    equipment_id: e.equipmentId || null,
    recurring_template_id: e.recurringTemplateId || null,
    date: e.date,
    is_archived: Boolean(e.isArchived),
    archived_at: e.archivedAt || null,
    created_at: e.createdAt,
  };
}

function recurringExpenseDto(t) {
  return {
    id: t._id,
    category: t.category,
    amount: t.amount,
    remark: t.remark,
    day_of_month: t.dayOfMonth,
    equipment_id: t.equipmentId || null,
    is_active: t.isActive,
    created_at: t.createdAt,
  };
}

function inventoryTransactionDto(t) {
  return {
    id: t._id,
    equipment_id: t.equipmentId,
    transaction_type: t.transactionType,
    quantity: t.quantity,
    unit_price: t.unitPrice,
    total_cost: t.totalCost,
    previous_stock: t.previousStock,
    new_stock: t.newStock,
    note: t.note,
    created_at: t.createdAt,
  };
}

function reservationDto(r) {
  return {
    id: r._id,
    customer_id: r.customerId,
    equipment_id: r.equipmentId,
    quantity: r.quantity,
    created_by: r.createdBy,
    shop_id: r.shopId,
    expires_at: r.expiresAt,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function noticeDto(n) {
  return {
    id: n._id,
    message: n.message,
    customer_name: n.customerName,
    equipment_name: n.equipmentName,
    created_at: n.createdAt,
  };
}

function planDto(plan) {
  if (!plan) return null;
  const asObject = (value) => (value instanceof Map ? Object.fromEntries(value) : value || {});
  return {
    id: plan._id,
    key: plan.key,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    billing_cycle: plan.billingCycle,
    currency: plan.currency,
    trial_days: plan.trialDays,
    is_public: plan.isPublic,
    is_active: plan.isActive,
    sort_order: plan.sortOrder,
    stripe_price_id: plan.stripePriceId || null,
    limits: asObject(plan.limits),
    features: asObject(plan.features),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// auto_renew and remaining_days are derived, never stored, so they can't drift.
function subscriptionDto(sub) {
  if (!sub) return null;
  const referenceEnd = sub.status === "trialing" ? sub.trialEndsAt : sub.currentPeriodEnd;
  const remainingDays = referenceEnd ? Math.max(0, Math.ceil((new Date(referenceEnd).getTime() - Date.now()) / DAY_MS)) : null;
  return {
    id: sub._id,
    status: sub.status,
    current_period_start: sub.currentPeriodStart,
    trial_ends_at: sub.trialEndsAt,
    current_period_end: sub.currentPeriodEnd,
    cancel_at_period_end: sub.cancelAtPeriodEnd,
    auto_renew: !sub.cancelAtPeriodEnd,
    remaining_days: remainingDays,
  };
}

module.exports = {
  userDto,
  shopDto,
  companyDto,
  categoryDto,
  maintenanceDto,
  equipmentDto,
  customerDto,
  rentalDto,
  paymentDto,
  saleDto,
  expenseDto,
  recurringExpenseDto,
  inventoryTransactionDto,
  reservationDto,
  noticeDto,
  planDto,
  subscriptionDto,
};
