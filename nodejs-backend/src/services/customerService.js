const Customer = require("../models/Customer");
const Rental = require("../models/Rental");
const EquipmentSale = require("../models/EquipmentSale");
const { shopFilter, createScope, findOwned } = require("../lib/tenantScope");
const { normalizeFileRef } = require("../storage");
const { conflict, notFound } = require("../lib/errors");
const { containsRegex, normalizePhone, escapeRegex } = require("../lib/text");

const PHOTO_KINDS = ["customer_photo"];
const DOC_KINDS = ["customer_doc"];

function listFilter(req, { search, include_archived }) {
  const filter = shopFilter(req, { isArchived: include_archived ? true : { $ne: true } });
  if (search) {
    const digits = normalizePhone(search).replace(/^\+/, "");
    filter.$or = [{ name: containsRegex(search) }, { phone: containsRegex(search) }];
    if (digits.length >= 3) filter.$or.push({ phoneNormalized: { $regex: escapeRegex(digits) } });
  }
  return filter;
}

async function findByPhone(req, phone) {
  const customer = await Customer.findOne(shopFilter(req, { phoneNormalized: normalizePhone(phone), isArchived: { $ne: true } })).lean();
  if (!customer) throw notFound("Customer not found.");
  return customer;
}

async function assertPhoneFree(req, shopId, phoneNormalized, exceptId) {
  const filter = { accountId: req.tenant.accountId, shopId, phoneNormalized, isArchived: { $ne: true } };
  if (exceptId) filter._id = { $ne: exceptId };
  if (await Customer.exists(filter)) {
    throw conflict("A customer with this phone number is already registered in this shop.", "DUPLICATE_PHONE");
  }
}

async function createCustomer(req, { name, phone, address, doc_url, photo_url }) {
  const phoneNormalized = normalizePhone(phone);
  await assertPhoneFree(req, req.tenant.shopId, phoneNormalized);
  const customer = await Customer.create({
    ...createScope(req),
    name,
    phone,
    phoneNormalized,
    address: address ?? null,
    docUrl: (await normalizeFileRef(doc_url, { req, kinds: DOC_KINDS })) ?? null,
    photoUrl: (await normalizeFileRef(photo_url, { req, kinds: PHOTO_KINDS })) ?? null,
  });
  return customer.toObject();
}

async function updateCustomer(req, id, { name, phone, address, doc_url, photo_url }) {
  const customer = await findOwned(Customer, id, req, { label: "Customer" });
  if (phone !== undefined) {
    const phoneNormalized = normalizePhone(phone);
    if (phoneNormalized !== customer.phoneNormalized) await assertPhoneFree(req, customer.shopId, phoneNormalized, customer._id);
    customer.phone = phone;
    customer.phoneNormalized = phoneNormalized;
  }
  if (name !== undefined) customer.name = name;
  if (address !== undefined) customer.address = address;
  if (doc_url !== undefined) customer.docUrl = await normalizeFileRef(doc_url, { req, kinds: DOC_KINDS, existing: [customer.docUrl] });
  if (photo_url !== undefined) {
    customer.photoUrl = await normalizeFileRef(photo_url, { req, kinds: PHOTO_KINDS, existing: [customer.photoUrl] });
  }
  await customer.save();
  return customer.toObject();
}

// Customers with rental or sale history can only be archived, never deleted,
// so invoices and statements stay intact.
async function deleteCustomer(req, id) {
  const customer = await findOwned(Customer, id, req, { label: "Customer", lean: true });
  const scope = { accountId: req.tenant.accountId, customerId: customer._id };
  const [active, rentals, sales] = await Promise.all([
    Rental.countDocuments({ ...scope, status: "Active" }),
    Rental.countDocuments(scope),
    EquipmentSale.countDocuments(scope),
  ]);
  if (active > 0) {
    throw conflict(
      `Cannot delete this customer — they have ${active} active rental${active === 1 ? "" : "s"}. Complete or cancel all rentals before deleting.`,
      "CUSTOMER_HAS_ACTIVE_RENTALS"
    );
  }
  if (rentals + sales > 0) {
    throw conflict("This customer has rental or sale history. Archive them instead.", "CUSTOMER_HAS_HISTORY");
  }
  await Customer.deleteOne({ _id: customer._id, accountId: req.tenant.accountId });
}

async function setArchived(req, id, archived) {
  const customer = await findOwned(Customer, id, req, { label: "Customer" });
  if (!archived) await assertPhoneFree(req, customer.shopId, customer.phoneNormalized, customer._id);
  customer.isArchived = archived;
  customer.archivedAt = archived ? new Date() : null;
  await customer.save();
  return customer.toObject();
}

// Rental/payment activity per customer, for list badges. Risk mirrors the
// alert rules: an overdue return or overdue promised payment is high risk;
// history with nothing owed is good standing.
async function statsFor(req, customerIds) {
  if (customerIds.length === 0) return new Map();
  const now = new Date();
  const scope = { accountId: req.tenant.accountId, customerId: { $in: customerIds } };
  const [rentalRows, saleRows] = await Promise.all([
    Rental.aggregate([
      { $match: scope },
      {
        $group: {
          _id: "$customerId",
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
          overdueReturns: {
            $sum: { $cond: [{ $and: [{ $eq: ["$status", "Active"] }, { $ne: ["$expectedReturnDate", null] }, { $lt: ["$expectedReturnDate", now] }] }, 1, 0] },
          },
          amountDue: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, "$amountDue", 0] } },
          overduePayments: {
            $sum: { $cond: [{ $and: [{ $gt: ["$amountDue", 0] }, { $ne: ["$dueDate", null] }, { $lt: ["$dueDate", now] }] }, 1, 0] },
          },
        },
      },
    ]),
    EquipmentSale.aggregate([{ $match: scope }, { $group: { _id: "$customerId", due: { $sum: "$amountDue" } } }]),
  ]);
  const saleDue = new Map(saleRows.map((r) => [String(r._id), r.due]));
  const result = new Map();
  for (const id of customerIds) {
    const row = rentalRows.find((r) => String(r._id) === String(id)) || {};
    const salesDue = saleDue.get(String(id)) || 0;
    const due = Math.round(((row.amountDue || 0) + salesDue) * 100) / 100;
    const risk = row.overdueReturns > 0 || row.overduePayments > 0 ? "high-risk" : row.completed > 0 && due <= 0 ? "good-standing" : "low-risk";
    result.set(String(id), {
      total_rentals: row.total || 0,
      active_rentals: row.active || 0,
      overdue_returns: row.overdueReturns || 0,
      amount_due: due,
      overdue_payments: row.overduePayments || 0,
      risk,
    });
  }
  return result;
}

module.exports = { listFilter, findByPhone, createCustomer, updateCustomer, deleteCustomer, setArchived, statsFor };
