const Rental = require("../models/Rental");
const Customer = require("../models/Customer");
const EquipmentSale = require("../models/EquipmentSale");
const payments = require("./paymentService");
const { shopFilter, accessibleFilter, findOwned } = require("../lib/tenantScope");
const { containsRegex, escapeRegex } = require("../lib/text");
const { notFound } = require("../lib/errors");
const { round2, billableDays } = require("../lib/money");
const { readAsPngDataUri } = require("../storage");
const { renderInvoicePdfBuffer } = require("./pdf/pdfPrinter");
const { buildInvoiceDocDefinition } = require("./pdf/invoiceDocument");
const { buildCustomerStatementDocDefinition } = require("./pdf/statementDocument");

function companyInfo(account, files) {
  return {
    name: account.companyName,
    logo_url: files.url(account.companyLogoUrl),
    address: account.companyAddress,
    phone: account.companyPhone,
    email: account.companyEmail,
    tax_id: account.taxId,
    footer_note: account.invoiceFooterNote,
    currency: account.currency || "INR",
  };
}

async function listFilter(req, { search, payment_status, date_from, date_to, customer_id }) {
  const filter = shopFilter(req, { status: "Completed" });
  if (payment_status) filter.paymentStatus = payment_status;
  if (customer_id) filter.customerId = customer_id;
  if (date_from || date_to) {
    filter.returnedAt = {};
    if (date_from) filter.returnedAt.$gte = date_from;
    if (date_to) filter.returnedAt.$lte = date_to;
  }
  if (search) {
    const customers = await Customer.find(shopFilter(req, { $or: [{ name: containsRegex(search) }, { phone: containsRegex(search) }] }))
      .select("_id")
      .limit(200)
      .lean();
    filter.$or = [{ customerId: { $in: customers.map((c) => c._id) } }, { invoiceNumber: { $regex: escapeRegex(search.slice(0, 50)), $options: "i" } }];
  }
  return filter;
}

async function findCompleted(req, rentalId) {
  const rental = await Rental.findOne(accessibleFilter(req, { _id: rentalId, status: "Completed" }))
    .populate({ path: "customerId", select: "name phone address", match: { accountId: req.tenant.accountId } })
    .populate({ path: "equipmentId", select: "name rentPerDay", match: { accountId: req.tenant.accountId } });
  if (!rental) throw notFound("Invoice not available until the rental is completed.");
  if (!rental.invoiceNumber) {
    rental.invoiceNumber = await payments.nextInvoiceNumber(rental.accountId, rental.returnedAt || new Date());
    await rental.save();
  }
  return rental;
}

// Every money figure comes from the persisted rental. Rentals completed
// before gross/rate were stored fall back to recomputing gross from the
// agreed (or, for very old rentals, current) daily rate.
function invoicePayload(rental, account, files) {
  const equipment = rental.equipmentId;
  const customer = rental.customerId;
  const days = billableDays(rental.rentedAt, rental.returnedAt);
  const rate = rental.dailyRate ?? equipment?.rentPerDay ?? 0;
  const gross = rental.grossAmount ?? round2(days * rate * rental.quantity);
  const discount = rental.discountAmount || 0;
  const lateFee = rental.lateFeeAmount || 0;
  const damage = rental.damageAmount || 0;
  const advance = rental.advanceAmount || 0;
  const paidAfter = rental.amountPaidOnReturn || 0;
  const refund = rental.refundAmount || 0;

  return {
    invoice_number: rental.invoiceNumber,
    issued_at: rental.returnedAt,
    due_date: rental.dueDate,
    status: rental.status,
    payment_status: rental.paymentStatus,
    order_id: rental.orderId || null,
    rental: {
      id: rental._id,
      equipment: { id: equipment?._id || null, name: equipment?.name || "Equipment", rent_per_day: rate },
      quantity: rental.quantity,
      rented_at: rental.rentedAt,
      returned_at: rental.returnedAt,
    },
    customer: {
      id: customer?._id || null,
      name: customer?.name || "Customer",
      phone: customer?.phone || null,
      address: customer?.address || null,
    },
    company: companyInfo(account, files),
    charges: {
      days_rented: days,
      rent_per_day: rate,
      quantity: rental.quantity,
      gross_amount: gross,
      discount_amount: discount,
      late_fee_amount: lateFee,
      damage_amount: damage,
      subtotal: round2(Math.max(gross - discount + lateFee + damage, 0)),
      tax_rate_percent: rental.taxRatePercent || 0,
      tax_amount: rental.taxAmount || 0,
      total_amount: rental.totalPrice,
      advance_amount: advance,
      amount_paid_on_return: paidAfter,
      refund_amount: refund,
      amount_paid_total: round2(advance - refund + paidAfter),
      amount_due: rental.amountDue || 0,
    },
  };
}

async function getInvoice(req, rentalId, files) {
  const rental = await findCompleted(req, rentalId);
  return invoicePayload(rental, req.account, files);
}

async function withLogo(company, account) {
  return { ...company, logo_data_uri: account.companyLogoUrl ? await readAsPngDataUri(account.companyLogoUrl) : null };
}

async function invoicePdf(req, rentalId, files) {
  const payload = await getInvoice(req, rentalId, files);
  payload.company = await withLogo(payload.company, req.account);
  const buffer = await renderInvoicePdfBuffer(buildInvoiceDocDefinition(payload));
  return { buffer, filename: `${payload.invoice_number}.pdf` };
}

// Full account summary for one customer: every rental and sale with the
// running balance still owed.
async function customerStatementPdf(req, customerId, files) {
  const customer = await findOwned(Customer, customerId, req, { label: "Customer", lean: true });
  const scope = { accountId: req.tenant.accountId, customerId: customer._id };
  const [rentals, sales] = await Promise.all([
    Rental.find({ ...scope, status: { $in: ["Active", "Completed"] } })
      .populate({ path: "equipmentId", select: "name", match: { accountId: req.tenant.accountId } })
      .sort({ rentedAt: -1 })
      .lean(),
    EquipmentSale.find(scope)
      .populate({ path: "equipmentId", select: "name", match: { accountId: req.tenant.accountId } })
      .sort({ soldAt: -1 })
      .lean(),
  ]);

  const rentalLines = rentals.map((r) => {
    const completed = r.status === "Completed";
    return {
      date: completed ? r.returnedAt : r.rentedAt,
      description: r.equipmentId?.name || "Equipment",
      detail: `Qty ${r.quantity}${r.invoiceNumber ? ` · Invoice ${r.invoiceNumber}` : ""}`,
      status: r.status,
      total: completed ? r.totalPrice : null,
      paid: completed ? round2(r.advanceAmount - (r.refundAmount || 0) + r.amountPaidOnReturn) : null,
      due: completed ? r.amountDue : null,
    };
  });
  const saleLines = sales.map((s) => ({
    date: s.soldAt,
    description: `${s.equipmentId?.name || "Equipment"} (sold)`,
    detail: `Qty ${s.quantity}`,
    status: s.paymentStatus,
    total: s.totalPrice,
    paid: s.amountPaid,
    due: s.amountDue,
  }));

  const lines = [...rentalLines, ...saleLines].sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalOutstanding = round2(
    rentals.reduce((sum, r) => sum + (r.status === "Completed" ? r.amountDue || 0 : 0), 0) + sales.reduce((sum, s) => sum + (s.amountDue || 0), 0)
  );
  const payload = {
    customer: { name: customer.name, phone: customer.phone, address: customer.address },
    company: await withLogo(companyInfo(req.account, files), req.account),
    lines,
    total_outstanding: totalOutstanding,
    generated_at: new Date(),
  };
  const buffer = await renderInvoicePdfBuffer(buildCustomerStatementDocDefinition(payload));
  return { buffer, filename: `statement-${customer.name.replace(/[^a-z0-9]/gi, "-")}.pdf` };
}

function listItemDto(r) {
  return {
    rental_id: r._id,
    order_id: r.orderId || null,
    invoice_number: r.invoiceNumber,
    issued_at: r.returnedAt,
    due_date: r.dueDate,
    customer: r.customerId && r.customerId._id ? { id: r.customerId._id, name: r.customerId.name, phone: r.customerId.phone } : null,
    equipment_name: r.equipmentId?.name || null,
    quantity: r.quantity,
    total_amount: r.totalPrice,
    amount_due: r.amountDue,
    payment_status: r.paymentStatus,
  };
}

module.exports = { listFilter, getInvoice, invoicePdf, customerStatementPdf, listItemDto };
