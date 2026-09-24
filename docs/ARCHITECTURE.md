# Architecture and Data Model

This describes the system after the hardening work (see [AUDIT.md](AUDIT.md) for what changed and why). The business rules themselves are described in [RENTAL_FLOW.md](RENTAL_FLOW.md).

## 1. System overview

```
 ┌────────────────────────────┐     ┌──────────────────────────┐
 │ web-dashboard (React, TS)  │     │ flutter-app (Flutter)     │
 │ businesses + /platform      │     │ counter staff and owners  │
 └─────────────┬──────────────┘     └────────────┬─────────────┘
               │  HTTPS, Bearer JWT, X-Shop-Id    │
               └───────────────┬──────────────────┘
                               ▼
                ┌──────────────────────────────┐        ┌───────────────────────────┐
                │ nodejs-backend (Express)      │──────▶│ MongoDB replica set/Atlas │
                │ validate → controller →       │        │ one database, all tenants │
                │ service → Mongoose models     │        └───────────────────────────┘
                └──────┬───────────────┬───────┘
                       │               │
          ┌────────────▼───┐   ┌───────▼────────┐   ┌─────────────┐
          │ File storage    │   │ SMTP (optional)│   │ Stripe (opt.)│
          │ local volume/S3 │   │ reset emails   │   │ billing      │
          └────────────────┘   └────────────────┘   └─────────────┘
```

## 2. Backend

### 2.1 Layers

```
src/
  app.js                   builds the Express app (factory, used by server and tests)
  config/env.js            every environment variable, validated with zod at startup
  routes/*.js              path → middleware chain → validator → controller
  validators/*.js          zod schemas for params, query and body
  controllers/*.js         HTTP only: read request, call a service, map to a DTO
  services/*.js            business rules, transactions; no req/res details beyond req.tenant
  dto/index.js             one response mapper per entity (snake_case contract)
  models/*.js              Mongoose schemas + indexes; plugins/tenantGuard.js
  storage/                 file storage abstraction (keys, drivers, image processing)
  lib/                     errors, validation, pagination, transactions, tenant scope, tokens, mailer, money
  middleware/              auth, tenant, rbac, subscription gates, rate limits, error handler
  migrations/              ordered data migrations + runner (see DEPLOYMENT.md)
```

### 2.2 Request pipeline

1. `pino-http` request logging with an `X-Request-Id` (accepted from the caller or generated).
2. `helmet`, `compression`, CORS allow-list (exposes the pagination headers).
3. Stripe webhook (raw body, signature verified) before the JSON parser.
4. `express.json` (1 MB), `express-mongo-sanitize`.
5. `/health`, `/ready`, `/files/*` (file serving, signature-checked for private files).
6. Global rate limit; stricter limits on login, signup, password reset and uploads.
7. Route chain for business data:

```
authenticate → requireTenant → requireWritableSubscription → [authorize] → [enforceLimit | requireFeature] → validate → controller
```

8. `notFoundHandler`, then `errorHandler`: every error becomes `{ detail, code, ...extra }`; unexpected errors are logged and answered with a generic message in production.

### 2.3 Multi-tenancy

- **Tenant = Account (one business).** Shops are branches of that business. Every tenant-owned document stores both `accountId` and `shopId`.
- `requireTenant` resolves `req.tenant = { accountId, shopId, shopIds, accountShopIds, userId, role, username }`. It **fails closed**: no business, no active shop, or an `X-Shop-Id` the user can't access means 403, never an unscoped query.
- Staff pinned to a shop can only use that shop; owners and admins can use any active shop of their business.
- Services only build filters through `lib/tenantScope.js` (`shopFilter`, `accessibleFilter`, `findOwned`).
- **Database guard:** `models/plugins/tenantGuard.js` throws on any query or aggregation on a tenant model whose filter lacks `accountId`. Platform code opts out explicitly with `setOptions({ skipTenantCheck: true })`.
- Uniqueness is scoped: usernames per business; customer phone (normalized) per shop; category and equipment names (case-insensitive) per shop; invoice numbers per business.
- Referenced ids (category, customer, equipment, files) are checked against the caller's business before use.

### 2.4 Authentication and roles

| Concept | Implementation |
|---|---|
| Login | Username + password (bcrypt, cost 12). Usernames are unique per business; if a username exists in several businesses the API answers `409 BUSINESS_CODE_REQUIRED` and the client asks for the business code (`Account.slug`). |
| Session | JWT HS256 `{ sub, tv }`: 8 h for staff, 7 days otherwise. `tv` (token version) must match the user's `tokenVersion`, so a password change, reset, role change or removal ends existing sessions. |
| Password reset | Hashed single-use token, 15-minute expiry, sent by email. The API never returns a code and never reveals whether an account exists. Owners/admins can set a staff member's password. |
| Roles | `owner`, `admin`, `staff` per business; `isPlatformAdmin` for the operator console. See the permission matrix in [SECURITY.md](SECURITY.md). |
| Plan gates | `enforceLimit` (numeric limits), `requireFeature` (feature flags) and `requireWritableSubscription` (lapsed or suspended businesses are read-only). |

### 2.5 Money, stock and transactions

- All multi-document writes (rentals, returns, cancellations, stock, sales, payments) run inside MongoDB transactions (`lib/transaction.js`). A standalone development server without replica set falls back to plain writes with a warning.
- Stock changes are single conditional atomic updates (`services/stockService.js`), so concurrent requests can't oversell.
- Every amount is rounded to cents when stored. Amounts received and refunded are recorded in the **Payment ledger**; reports recognise cash on the date it was received.

### 2.6 File storage

- Uploads (`POST /upload?kind=…`, one image per request) must declare an image type and extension (JPEG, PNG, WebP or GIF; a generic `application/octet-stream` is accepted), and are then decoded with sharp, so a renamed or truncated file is refused with `UNSUPPORTED_IMAGE`. They are re-encoded to WebP with EXIF stripped, capped at 1600 px, and a 320 px thumbnail is written alongside. The rules live in `storage/uploadRules.js`; the web app (`utils/image.ts`) and the Flutter app (`core/media.dart`) mirror them for early feedback.
- An equipment item has at most 4 photos (`TOO_MANY_IMAGES`). Items saved before the limit keep their extra photos and can remove some, but can't add more until they are under it. Clients upload a multi-photo selection as parallel single-file requests, so each photo has its own progress and error.
- List endpoints return thumbnails next to full images (`image_thumbs`, `photo_thumb_url`); rentals embed the customer's `photo_thumb_url` so dashboard alerts can show the same avatar.
- Removing a photo from a record drops its key only. The file is kept because a duplicated equipment item shares its source's keys; a future clean-up job must count references across records first.
- The database stores **keys** (`t/<accountId>/<kind>/<uuid>.webp`), never URLs. DTOs build URLs per request from `PUBLIC_API_URL` (or the request host behind a trusted proxy), so web, Android and production all get working links.
- Visibility by kind: equipment photos, logos and QR codes are public; customer photos, ID documents, receipts and damage photos are private and served only through signed links that expire after 1–1.5 hours.
- Drivers: `local` (a persistent volume) or `s3` (any S3-compatible bucket; public images can go through a CDN via `S3_PUBLIC_BASE_URL`).
- Files uploaded by older versions (absolute `/static/uploads/…` URLs) keep working: they resolve to signed `legacy/…` links.

### 2.7 Reports

Dashboard, reports summary, net profit, daily sheet and customer risk are computed on the server over the whole shop (aggregations and indexed queries), not from capped lists in the clients.

## 3. Data model

All models have `createdAt`/`updatedAt`. Collections marked **T** carry `accountId` + `shopId` and are protected by the tenant guard.

| Collection | Purpose | Key fields | Main indexes |
|---|---|---|---|
| `accounts` | Business (tenant root) | companyName, slug (business code), ownerUserId, subscriptionId, branding fields, defaultTaxRatePercent, currency | slug unique |
| `shops` (T: accountId) | Branches | name, address, phone, isActive | accountId + isActive |
| `users` | Logins | username, email, hashedPassword, role, accountId, shopId (staff pin), isPlatformAdmin, tokenVersion, resetTokenHash/ExpiresAt, lastLoginAt | accountId + username unique |
| `subscriptions`, `plans` | Billing | status, trialEndsAt, period dates, planId; plan limits/features maps | accountId unique; plan key unique |
| `categories` (T) | Equipment groups | name, nameKey, icon, sortOrder, isArchived | accountId + shopId + nameKey unique (active) |
| `equipment` (T) | Rentable items | name, nameKey, stockCount (on hand), damagedCount, rentPerDay, depositAmount, purchasePricePerUnit, usefulLifeYears, images (keys), categoryId | accountId + shopId + nameKey unique (active); + isArchived + name |
| `customers` (T) | Renters/buyers | name, phone, phoneNormalized, address, docUrl, photoUrl (keys), isArchived | accountId + shopId + phoneNormalized unique (active) |
| `rentals` (T) | One equipment line of an order | orderId, customerId, equipmentId, quantity, dailyRate (agreed), advanceAmount, dates, grossAmount, discount, lateFee, damage, tax, totalPrice, amountPaidOnReturn, refundAmount, amountDue, dueDate, invoiceNumber, status, paymentStatus, ledger | shop + status + rentedAt; shop + status + returnedAt; shop + customer + status; equipment + status; invoiceNumber unique per business |
| `payments` (T) | Money in/out ledger | kind (advance, return, due, sale, refund), amount, method, receivedAt, rental/sale/customer/order refs | shop + receivedAt; rentalId; saleId; customerId |
| `equipmentsales` (T) | Equipment sold | quantity, unitPrice, totals, book value, gain/loss, amountPaid/Due | shop + soldAt |
| `inventorytransactions` (T) | Stock movements | type (INITIAL_STOCK, STOCK_IN, SCRAP, SALE), quantity, unitPrice, before/after | equipmentId + createdAt; shop + createdAt |
| `maintenancelogs` (T) | Damage/repair/scrap history | action, quantity, cost, photos, rentalId, customerId | equipmentId + createdAt |
| `expenses` (T), `recurringexpensetemplates` (T) | Costs | category, amount, paymentMode, receipt (key), date, periodKey for recurring | shop + isArchived + date; recurringTemplateId + periodKey unique |
| `reservations` (T), `reservationnotices` (T) | Draft holds while building an order | quantity, createdByUserId, expiresAt (TTL 4 h); notices TTL 3 days | shop + customer + equipment unique |
| `settings` (T: accountId) | Key/value settings | key, value, shopId for shop-scoped keys | accountId + shopId + key unique |
| `fileobjects` (T: accountId) | Registry of uploaded files | key, kind, visibility, size, dimensions | key unique |
| `counters` | Invoice number sequences | scopeKey `invoice:<accountId>:<year>` | scopeKey unique |
| `migrations` | Applied data migrations | name | name unique |

Relationships:

```
Account 1─1 Subscription *─1 Plan
Account 1─* Shop 1─* {Category, Equipment, Customer, Rental, Payment, Expense, ...}
Account 1─* User (staff may be pinned to one Shop)
Category 1─* Equipment 1─* {Rental, InventoryTransaction, MaintenanceLog, EquipmentSale, Reservation}
Customer 1─* {Rental, EquipmentSale, Payment}
Rental (orderId groups lines) 1─* Payment, 0..1─* MaintenanceLog
```

Deletion rules keep history intact: equipment and customers with rentals or sales can only be archived; shops with records can only be deactivated; deleting a business (platform console) removes every tenant collection and its files.

## 4. Web dashboard

- `api/http.ts`: one axios instance. Adds the token and `X-Shop-Id`, normalises errors to `{ detail, code }`, signs out on 401, recovers from an inaccessible shop.
- `api/services/*`: typed functions per resource; pages never call `http` directly.
- `lib/queryClient.ts`: the TanStack Query cache is keyed by the active shop, so switching shops never shows another shop's data.
- Contexts: `AuthContext` (session, explicit vs expired sign-out), `ShopContext` (active shop), `CurrencyContext`, `ThemeContext`.
- Routing: public auth pages; `ProtectedRoute` → `RequireTenant` → `DashboardLayout` (waits for the shop, shows a read-only banner when the plan has lapsed); owner/admin-only routes behind `RequireRole`; `/platform/*` behind `RequirePlatformAdmin`. Pages are lazy-loaded.
- UI kit (`components/ui`): Button, Input (hints, ARIA), Select, Modal (focus trap, bottom sheet on phones), Table (loading/error/empty), QueryState, Skeleton, EmptyState, FormError, PageHeader, Img (lazy, placeholder), Avatar (photo with initials while loading and on failure, thumbnail then full image; every customer and user avatar), ImageUpload (pick several at once up to a limit, previews with per-file progress, retry/remove on failure, tells the form to wait while uploading). `utils/media.ts` is the single place that turns a file reference into a loadable URL. Brand colours are design tokens in `index.css`.
- `utils/permissions.ts` mirrors the API's role rules so staff don't see actions that would be refused.

## 5. Flutter app

- `app/controller.dart`: session (token in the OS keystore), role, business code, shops and active shop, plan features, currency.
- `core/api.dart`: HTTP client (token, `X-Shop-Id`, 401 handling, error codes, uploads with kind), `resolveMediaUrl` (the one media URL resolver) and `RentalRepository`.
- `core/widgets.dart` `PersonAvatar` (photo or first letter, used by the customer list, picker and Home stories); `core/image_field.dart` `MultiImageField` (gallery multi-select up to the limit, camera, per-photo spinner, retry/remove); `core/media.dart` upload rules and picker.
- `features/*`: screens. Returns use the server's preview and transactional return; reports and dashboard totals come from server aggregates; owner/admin tools are hidden for staff; Team screen for managing staff.
