# API Reference

Base URL: the API origin (e.g. `https://api.example.com`). JSON in and out, snake_case fields.

## Conventions

**Authentication.** Every endpoint except those marked *public* needs `Authorization: Bearer <access_token>` from a login or signup response.

**Shop.** Business endpoints act on one shop. Send `X-Shop-Id: <shop id>` to choose it; without it, a pinned staff member's shop or the business's first active shop is used. A shop the user can't access returns `403 SHOP_NOT_ACCESSIBLE`.

**Roles.** *admin* means owner or admin. *any* means any signed-in member of the business.

**Pagination.** List endpoints accept `page` and `page_size` (max 500) and return a bare array plus `X-Total-Count`, `X-Page`, `X-Page-Size`, `X-Total-Pages` headers. Without paging parameters, at most 1000 rows are returned and `X-Truncated: true` is set when there are more.

**Errors.** Always `{ "detail": "<readable message>", "code": "<MACHINE_CODE>", ...extra }`.

| Status | Typical codes |
|---|---|
| 400 | `VALIDATION_ERROR` (with `errors[]`), `BAD_JSON`, `INVALID_ID`, `WEAK_PASSWORD`, `INSUFFICIENT_STOCK` (with `available`), `ADVANCE_TOO_HIGH`, `INVALID_FILE_REF`, `UNSUPPORTED_IMAGE`, `TOO_MANY_IMAGES`, `UPLOAD_ERROR`, `INVALID_RESET_TOKEN`, `RESET_METHOD_REMOVED`, `NOTHING_DUE`, `MIXED_CUSTOMERS`, `LAST_ACTIVE_SHOP` |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `TOKEN_INVALID`, `TOKEN_REVOKED` |
| 402 | `TRIAL_EXPIRED`, `ACCOUNT_SUSPENDED`, `SUBSCRIPTION_INACTIVE`, `NO_SUBSCRIPTION` (writes only) |
| 403 | `FORBIDDEN`, `NO_ACCOUNT`, `NO_ACTIVE_SHOP`, `SHOP_NOT_ACCESSIBLE`, `PLAN_LIMIT_REACHED` (with `resource`, `limit`, `current`), `FEATURE_NOT_AVAILABLE`, `OWNER_PROTECTED`, `FILE_LINK_EXPIRED`, `PLATFORM_ADMIN_USE_ADMIN_LOGIN` |
| 404 | `NOT_FOUND` (records of other businesses also read as not found) |
| 409 | `BUSINESS_CODE_REQUIRED`, `DUPLICATE`, `DUPLICATE_PHONE`, `USERNAME_TAKEN`, `RESERVATION_CONFLICT` (with `conflict`, `available_for_you`), `EQUIPMENT_HAS_HISTORY`, `CUSTOMER_HAS_HISTORY`, `CUSTOMER_HAS_ACTIVE_RENTALS`, `SHOP_HAS_STAFF`, `SHOP_NOT_EMPTY` |
| 413 | `FILE_TOO_LARGE`, `PAYLOAD_TOO_LARGE` |
| 429 | `RATE_LIMITED` |

Responses carry `X-Request-Id`; quote it when reporting a problem.

## Public

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Process up |
| GET | `/ready` | Database connected (503 otherwise) |
| GET | `/plans` | Public plan catalog |
| GET | `/catalog` | Plan limit/feature definitions, currencies, category icons, payment methods |
| GET | `/files/<key>` | Public files directly; private files need the `exp` and `sig` query parameters from a URL the API issued |

## Auth — `/auth`

| Method | Path | Access | Body / notes |
|---|---|---|---|
| POST | `/register` | public | `username, password, company_name, shop_name?, currency?, email?` → token, `business_code`, `shop_id`, `trial_ends_at` |
| POST | `/login` | public | `username, password, business_code?` → token. `409 BUSINESS_CODE_REQUIRED` when the username exists in several businesses |
| POST | `/admin/login` | public | Platform operators only |
| POST | `/forgot-password` | public | `username, business_code?` → always the same generic message; emails a link if the account has an email address |
| POST | `/reset-password` | public | `token, new_password` |
| GET | `/me` | signed in | Profile, role, business code |
| PUT | `/me/password` | signed in | `current_password, new_password` → new token; other sessions end |
| GET | `/users` | admin | Team list |
| POST | `/users` | admin | `username, password, role (admin/staff), shop_id?, email?` (limit `maxStaffUsers`) |
| PUT | `/users/:id` | admin | `username?, role?, shop_id?, email?` (ends that user's sessions) |
| PUT | `/users/:id/role` | admin | `role` |
| PUT | `/users/:id/password` | admin | `new_password` (ends that user's sessions) |
| DELETE | `/users/:id` | admin | The owner can't be removed |

`POST /signup`, `POST /request-reset/:username` and the `/users/username/:username` routes remain for older app builds.

## Business

| Area | Endpoints | Access |
|---|---|---|
| Account | `GET /account/me`, `GET /account/usage`, `GET /account/company`, `PUT /account/company` | read: any; write: admin |
| Shops | `GET /shops`, `GET /shops/:id/summary`, `POST /shops`, `PUT /shops/:id`, `DELETE /shops/:id` | read: any; write: admin |
| Settings | `GET /settings`, `GET /settings/:key`, `PUT /settings/:key {value}` | read: any; write: admin |
| Categories | `GET /categories`, `POST /categories`, `POST /categories/reorder {ordered_ids}`, `PUT/DELETE /categories/:id`, `POST /categories/:id/archive\|restore` | read: any; write: admin |
| Equipment | `GET /equipment?search&category_id&include_archived`, `GET /equipment/:id`, `POST /equipment`, `PUT/DELETE /equipment/:id`, `POST /equipment/:id/archive\|restore\|duplicate\|scrap\|sell` | read: any; write: admin |
| Stock and maintenance | `POST /equipment/:id/stock {quantity_added, unit_price?, note?}`, `POST /equipment/maintenance {equipment_id, action (Damage/Repair), quantity?, cost?, photos?}` | any |
| Sales | `GET /equipment/sales`, `GET /equipment/sales/summary`, `POST /equipment/sales/:id/payment` | admin |
| Customers | `GET /customers?search&include_archived&include_stats`, `GET /customers/:idOrPhone`, `POST /customers`, `PUT /customers/:id`, `GET /customers/:id/statement/pdf` | any |
| Customers (manage) | `DELETE /customers/:id`, `POST /customers/:id/archive\|restore` | admin |
| Rentals | `GET /rentals?status&date_from&date_to&customer_id&search`, `GET /rentals/history?include_cancelled&...`, `GET /rentals/:id`, `GET /rentals/:id/payments` | any |
| Rentals (operate) | `POST /rentals`, `POST /rentals/bulk`, `PUT /rentals/:id`, `POST /rentals/:id/cancel`, `POST /rentals/return/preview`, `POST /rentals/return`, `POST /rentals/:id/complete`, `POST /rentals/:id/payment` | any |
| Rentals (delete) | `DELETE /rentals/:id` | admin |
| Invoices | `GET /invoices?search&payment_status&date_from&date_to&customer_id`, `GET /invoices/:rentalId`, `GET /invoices/:rentalId/pdf` | any |
| Reservations | `GET/POST /reservations`, `DELETE /reservations/:id`, `DELETE /reservations/customer/:customerId`, `POST /reservations/:id/transfer`, `GET /reservations/notices`, `POST /reservations/notices/:id/ack` | any |
| Expenses | `GET /expenses?search&category&date_from&date_to&include_archived`, `POST /expenses` | any |
| Expenses (manage) | `PUT/DELETE /expenses/:id`, archive/restore, `/expenses/recurring` CRUD (`GET` for any) | admin |
| Inventory | `GET /inventory/transactions?equipment_id`, `GET /inventory/summary` | any |
| Reports | `GET /reports/dashboard?tz`, `GET /reports/daily?start_date&end_date` | any |
| Reports (analysis) | `GET /reports/summary` (feature `analytics`), `GET /reports/net-profit` (feature `advancedReports`), `GET /reports/payments` | admin |
| Status | `GET /stats` | any |
| Uploads | `POST /upload?kind=` multipart field `file`, one image per request → `{ key, url, thumb_url, kind }`. Kinds: `equipment`, `logo`, `qr_code` (public); `customer_photo`, `customer_doc`, `receipt`, `damage` (private). JPEG, PNG, WebP or GIF, up to `UPLOAD_MAX_BYTES` (10 MB). Errors: `UNSUPPORTED_IMAGE` (400: wrong type or extension, HEIC, damaged file), `FILE_TOO_LARGE` (413), `UPLOAD_ERROR` (400: more than one file) | any |
| Subscription | `GET /subscription`, `GET /subscription/invoices`, `POST /subscription/checkout {plan_key}`, `POST /subscription/portal`, `POST /subscription/cancel` | read: any; actions: admin |

Send file references back exactly as received (URL or key); the API stores the key. A reference listed twice is stored once.

Equipment `images` holds at most 4 photos. A request that would add photos beyond that fails with `400 TOO_MANY_IMAGES` (with `max_images`) and changes nothing; items saved with more photos before the limit can keep or remove them. Lists carry thumbnails: `image_thumbs` on equipment, `photo_thumb_url` on customers and on the `customer` embedded in rentals and dashboard alerts.

## Return request (example)

```http
POST /rentals/return
{
  "rental_ids": ["66f…a1", "66f…a2"],
  "discount_amount": 50,
  "late_fee_amount": 0,
  "amount_paid": 300,
  "payment_method": "UPI",
  "damages": [{ "rental_id": "66f…a2", "amount": 120, "damaged_quantity": 1, "remark": "Cracked blade" }]
}
```

Response: `{ "rentals": [...], "summary": { "lines": [...], "totals": { "total_amount", "advance_amount", "refund_amount", "paid_now", "amount_due", "discount_capped", ... } } }`. The preview endpoint returns the same `summary` without saving.

## Platform console — `/platform` (platform operators)

`GET /dashboard`, `GET/POST /plans`, `PUT/DELETE /plans/:id`, `GET /accounts`, `GET /accounts/:id`, `PUT /accounts/:id/plan {plan_id, start_date?, expiry_date?, auto_renew?}`, `POST /accounts/:id/suspend`, `POST /accounts/:id/reactivate`, `DELETE /accounts/:id` (permanent: removes the business, all its records and files).

## Webhook

`POST /subscription/webhook`: Stripe events, verified with `STRIPE_WEBHOOK_SECRET` (raw body).
