# Business Flow: from signup to reports

How the product works end to end, with the endpoint behind each step. Amounts are in the business's currency and stored to the cent.

## 0. Who does what

| Actor | How they get access | What they do |
|---|---|---|
| Platform operator | `npm run seed:super-admin`, then `/platform/login` | Manages businesses, plans, suspensions |
| Owner | Self-signup (web `/signup` or the app's "Start free trial") | Runs one business with one or more shops; billing |
| Admin | Added by an owner or admin | Everything an owner does except owning billing |
| Staff | Added by an owner or admin, optionally pinned to one shop | Customers, rentals, returns, payments, stock-in, expenses |
| Customer | A record only; never logs in | Rents or buys equipment |

Permissions per role are listed in [SECURITY.md](SECURITY.md#permissions).

## 1. Onboarding

1. **Sign up**: `POST /auth/register {username, password, company_name, shop_name?, currency?, email?}`. In one transaction: the owner, the business (with a generated **business code**), a default shop and a trial subscription. The response includes a token and the business code.
2. **Company details**: `PUT /account/company` for address, phone, tax ID, default tax %, currency, invoice footer, and logo (plan feature `customBranding`).
3. **Settings**: `PUT /settings/:key`, e.g. `max_discount_percent` (business-wide), `low_stock_threshold` and `qr_code` (per shop).
4. **Shops**: `POST /shops` (plan limit `maxShops`).
5. **Team**: `POST /auth/users {username, password, role, shop_id?, email?}` (plan limit `maxStaffUsers`, owner not counted). A username only has to be unique inside the business. Staff sign in with username and password; they only need the business code if the same username exists in another business.

## 2. Catalog and stock

| Step | Endpoint | Effect |
|---|---|---|
| Add category | `POST /categories` | Names are unique per shop, ignoring case |
| Add equipment | `POST /equipment` (limit `maxEquipment`) | With opening stock: an `INITIAL_STOCK` movement; with a purchase price: an "Equipment Purchase" expense (capitalised, depreciated in reports) |
| Add stock | `POST /equipment/:id/stock` | `STOCK_IN` movement and a "Stock Purchase" expense |
| Report damage / repair | `POST /equipment/maintenance {action, quantity, cost, photos}` (feature `maintenance`) | Damaged units can't be rented until repaired; repair cost becomes an expense |
| Scrap | `POST /equipment/:id/scrap` | Units removed; `SCRAP` movement and log |
| Sell | `POST /equipment/:id/sell` | Units removed; sale record with gain/loss vs purchase price; payment recorded in the ledger |
| Archive / restore / delete | `/equipment/:id/archive`, `/restore`, `DELETE` | Items with rental or sale history can only be archived |

Stock rules: `stockCount` is what's physically in the shop (rented-out units are subtracted); `available = stockCount − damagedCount`. Every change is atomic, so two counters can't rent the last unit at the same time.

## 3. Customers

- Find: `GET /customers?search=` (name or phone) or `GET /customers/:phone` (normalised: `+91 98765 43210` equals `9876543210`).
- Add: `POST /customers` (limit `maxCustomers`). One active customer per phone number per shop.
- Documents: the photo and ID document are private files, shown through short-lived links.
- Statement: `GET /customers/:id/statement/pdf` lists every rental and sale with what's still owed.
- Customers with history can only be archived.

## 4. Draft (reservation) stage — mobile

1. `POST /reservations {customer_id, equipment_id, quantity}` holds units for a customer's draft for 4 hours.
2. If other drafts already hold the units, the API answers `409` with who holds them and how many are left; staff can `POST /reservations/:id/transfer`, which notifies the previous holder (`GET /reservations/notices`).
3. Creating the rental releases the customer's holds.

## 5. Renting

`POST /rentals/bulk {customer_id, items[{equipment_id, quantity}], expected_return_date?, advance_amount?, payment_method?, remark?}` (`POST /rentals` for a single item).

- The customer and every item must belong to the active shop; archived items can't be rented.
- If an expected return date is given, the advance can't exceed the estimated total (`days × rate × quantity` over all items).
- One rental document is created per item; all share an `orderId`.
- The advance is **split across the items** in proportion to their expected value (with no return date: by daily value), and each part is recorded in the ledger as an `advance` payment.
- Each item's daily rate is **snapshotted** as `dailyRate`; later price changes don't affect this rental.
- Stock is taken atomically; if any item is short, nothing is created.

## 6. While out

| Action | Endpoint | Effect |
|---|---|---|
| Edit | `PUT /rentals/:id {expected_return_date?, advance_amount?, remark?, payment_method?}` | A change to the advance is recorded as an extra advance or a refund |
| Cancel | `POST /rentals/:id/cancel {refund_advance = true}` | Units back in stock; the advance is refunded (recorded) unless told otherwise |
| Delete (admin) | `DELETE /rentals/:id` | For mistaken entries: stock returned if still out, ledger rows removed |

## 7. Return and invoice

Preview: `POST /rentals/return/preview`. Complete: `POST /rentals/return` (one or more active rentals of the same customer, in one transaction). `POST /rentals/:id/complete` remains for a single rental.

Input: `discount_amount, late_fee_amount, tax_rate_percent?, amount_paid, payment_method, due_date?`, and optional per-item `damages[{rental_id, amount, damaged_quantity, photos, remark}]`.

```
days      = max(ceil((returned − rented) / 24h), 1)
gross     = days × agreed daily rate × quantity                      (per item)
discount  = min(requested, gross total), capped at max_discount_percent of gross if set
            then split across items by gross, as is the late fee
subtotal  = max(gross − discount + late fee + damage, 0)             (per item)
tax       = subtotal × tax rate (default: the business's rate)       (snapshotted)
total     = subtotal + tax
refund    = max(advance − total, 0)                                  → recorded as a refund
owed      = max(total − advance, 0); the amount paid now is split across items by what each owes
due       = owed − paid now; paymentStatus = Paid | Partial | Pending
```

Side effects per item: units back in stock, damaged units flagged with a maintenance log (charge, photos, customer and rental linked), an invoice number `INV-<year>-<nnnn>` sequential per business, and `return`/`refund` ledger rows.

Invoice: `GET /invoices/:rentalId` and `/pdf`. The figures are read from the stored rental (including the stored gross), so reprints never change.

## 8. Collecting dues

`POST /rentals/:id/payment {amount_paid, payment_method?, discount_amount?, due_date?}`: the payment (capped at what's owed) goes into the ledger as `due`; `discount_amount` writes off part of the remaining balance. The promised `due_date` drives overdue-payment alerts.

## 9. Expenses

- Manual: `POST /expenses` (receipt photo is private).
- Automatic: equipment purchase, stock purchase, repair cost.
- Recurring: templates (`POST /expenses/recurring`, day 1–28) create one expense per template per month when the expense list is read; a unique index guarantees no duplicates.

## 10. Reports

| Report | Endpoint | Basis |
|---|---|---|
| Dashboard | `GET /reports/dashboard?tz=` | Active/overdue/due-soon rentals, cash received this and last month, outstanding dues, fleet utilisation, low stock |
| Summary | `GET /reports/summary?start_date&end_date&tz` (admin, feature `analytics`) | Cash received from the ledger (refunds subtracted), expenses, trend by day or month, top equipment/customers/categories, all-time totals |
| Net profit | `GET /reports/net-profit` (admin, feature `advancedReports`) | Cash rental income + sale revenue − operating expenses − straight-line depreciation, per equipment too |
| Payments | `GET /reports/payments` (admin) | Ledger entries with customer names |
| Daily sheet | `GET /reports/daily` | Everything that went out or came back on a day |
| Sales | `GET /equipment/sales/summary` | Equipment sales and gain/loss |

Rentals created before the ledger existed are still counted, from their stored fields (advance on the rental date, payment on the return date). The optional migration `005-payment-ledger-backfill` copies them into the ledger.

## 11. Subscription lifecycle

```
signup → trialing ──(trial ends)──▶ read-only (402 TRIAL_EXPIRED on writes)
            │
            ├─ operator assigns a plan (/platform/accounts/:id/plan) ─▶ active
            └─ Stripe checkout completes ─▶ active on the purchased plan
active ──(Stripe payment fails)──▶ past_due (still usable) ──(Stripe cancels)──▶ canceled (read-only)
any ──(operator suspends)──▶ suspended (read-only) ──(reactivate)──▶ active
```

Read-only means signing in, viewing and exporting work; creating or changing anything returns `402` until the subscription is restored. Billing endpoints stay available.

## 12. States

```
Rental.status:          Active ──return──▶ Completed
                          └────cancel────▶ Cancelled
Rental.paymentStatus:   Pending ──▶ Partial ──▶ Paid
EquipmentSale.paymentStatus: Pending ──▶ Partial ──▶ Paid
```

## 13. Known limits

- An order is still one rental document per item with a shared `orderId`, so each item gets its own invoice number. A single order-level invoice is follow-up work.
- Money is stored as a floating-point number rounded to cents; integer minor units would be stricter.
- Reservation holds are advisory for drafts; rental creation checks physical stock, not other customers' holds.
