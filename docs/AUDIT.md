# Rental Manager — Phase 1 Audit Report

> **Resolution status (updated after the hardening work, 2026-09-23).** The findings below are the original audit, kept as written. This table records what was done. Tests named here are in `nodejs-backend/tests/`, `web-dashboard/src/**/*.test.tsx`, `web-dashboard/e2e/` and `flutter-app/test/`.
>
> | ID | Status | How / where verified |
> |---|---|---|
> | P0-1 anonymous reads | **Fixed** | All business routes require login and a business; `/stats` scoped. `tenancy.test.js` "rejects anonymous access to every business route" |
> | P0-2 reset takeover | **Fixed** | Hashed single-use emailed tokens (15 min), generic responses, admin-set staff passwords, rate limit. `auth.test.js` (4 tests) |
> | P0-3 fail-open scoping | **Fixed** | `requireTenant` fails closed; shop pin validated; deactivation guards; DB tenant guard plugin. `tenancy.test.js` (5 tests) |
> | P0-4 legacy superusers | **Fixed** | Legacy mode removed; atomic signup; platform admins confined to `/platform`. `tenancy.test.js`, `auth.test.js` |
> | P0-5 advance duplication | **Fixed** | Advance split across lines; `orderId`. `rentals.test.js` + Playwright rental journey |
> | P1-1 global usernames | **Fixed** | Unique per business + business code at login. `auth.test.js`, `LoginPage.test.tsx`, Flutter `flows_test.dart` |
> | P1-2 user-creation defects | **Fixed** | Owner not counted; shop validated; explicit roles; server password policy; no token on create; atomic signup. `auth.test.js` |
> | P1-3 images | **Fixed** | Storage abstraction (local/S3), keys not URLs, sharp WebP + thumbnails, private signed links, legacy URLs served. `uploads.test.js` (10 tests) |
> | P1-4 stock races | **Fixed** | Atomic conditional updates in transactions. `rentals.test.js` "never oversells under concurrent requests" |
> | P1-5 subscription gates, Stripe plan | **Fixed** | Writes blocked when lapsed; plan mapped from Stripe price. `subscription.test.js` |
> | P1-6 secrets/auth hardening | **Fixed in code; action needed** | Env validation (32+ char secret in production), token versioning, rate limits, error handler. **The current production `JWT_SECRET` must be rotated** (DEPLOYMENT.md §3). |
> | P1-7 foreign references | **Fixed** | Ownership checks for category, equipment, customer and file references. `tenancy.test.js`, `uploads.test.js` |
> | P1-8 `/stats` | **Fixed** | Tenant-scoped, login required |
> | P2-1 indexes, slow queries | **Fixed** | Indexes for hot paths, escaped/bounded search, page-size cap, `$facet` sales summary. Built by migration 004 |
> | P2-2 client-side aggregation | **Fixed** | Server dashboard, summary, daily, payments and customer-stats endpoints; web and Flutter switched. `reports.test.js` |
> | P2-3 money correctness | **Fixed** | Rate snapshot, stored gross, payment ledger, refunds, write-offs, stock-cost summary, numeric coercion, recurring uniqueness. `rentals.test.js`, `crud.test.js` |
> | P2-4 validation and errors | **Fixed** | zod on every route, single error contract |
> | P2-5 phone numbers | **Fixed** | Normalised phone + scoped unique index; stale global index dropped by migration 004. `tenancy.test.js`, `migrations.test.js` |
> | P2-6 web shop-switch cache | **Fixed** | Cache keyed by shop, header set synchronously, pages wait for shop. `queryClient.test.ts` |
> | P2-7 Flutter parity | **Fixed** | Shop header/picker, roles, team screen, 401 handling, secure storage. `flows_test.dart` |
> | P2-8 batch return | **Fixed** | Transactional `POST /rentals/return` with server preview; client math removed |
> | P2-9 orphaned data | **Fixed** | History-preserving delete rules; account deletion covers every collection and file. `platform.test.js` |
> | P3-1 layering | **Done** | routes → validators → controllers → services → models |
> | P3-2 tests | **Done** | 87 API, 26 web, 4 e2e journeys, 18 Flutter |
> | P3-3 git, CI, env, Docker | **Done** | git history, GitHub Actions, env schema, Dockerfiles, compose |
> | P3-4 TS strict, shared types | **Partly done** | TS strict on; lists served from `/catalog`. Types are still hand-written; OpenAPI generation is follow-up |
> | P3-5 order model | **Partly done** | Lines share `orderId`, batch returns are atomic. One invoice per order is follow-up |
> | P3-6 logging, audit trail | **Partly done** | Structured logs with request ids; platform deletions logged. A persisted audit log is follow-up |
> | P4-1..P4-6 UX | **Done** | Query states, design tokens, accessible modal, lazy images and thumbnails, splash delay removed, role-aware UI, responsive check in e2e |
> | P5 docs | **Done** | README files, API, architecture, flow, security, deployment |


Date: 2026-09-23 · Scope: `nodejs-backend`, `web-dashboard`, `flutter-app`, `migration` · Mode: read-only. No application code was changed.

Companion documents: [ARCHITECTURE.md](ARCHITECTURE.md) (architecture and data model) and [RENTAL_FLOW.md](RENTAL_FLOW.md) (end-to-end business flow).

---

## 0. Executive summary

The product is feature-rich, and the web API layer is cleanly separated. But **tenant isolation is not safe today**. Five stop-ship issues were reproduced against the real backend code on an in-memory database:

1. **Anyone on the internet can read every tenant's customers, equipment, and categories.** No login is needed (`P0-1`).
2. **Anyone can take over any account, including the platform operator's.** The password-reset endpoint returns the reset code in its response (`P0-2`).
3. **Tenant scoping fails open.** In several ordinary situations a logged-in shop user sees every other shop's data: a staff user pinned to an invalid shop, or a deactivated or deleted shop (`P0-3`).
4. **Users without an account id have unscoped, platform-wide access.** This includes the seeded platform admin and orphans from a failed signup (`P0-4`).
5. **Every multi-item rental with an advance is under-billed.** The advance is copied onto every line, so the amount due is understated and revenue is overstated (`P0-5`).

The two reported bug classes have concrete root causes:
- **User creation** (§6.1): usernames are unique across the whole platform, the staff limit counts the owner, `shop_id` is unvalidated, signup is non-atomic, and there is no server-side password policy.
- **Images** (§6.2): absolute URLs bound to the uploading client's host are stored in the database; files live on ephemeral local disk; there are no thumbnails; format checks are weak; files (including customer ID documents) are public.

There are **no automated tests** for the backend or the web app, and **no version control** on any folder. Both need to be in place before code changes start (Phase 0 in §12).

---

## 1. Inputs and missing pieces

| Item | Status |
|---|---|
| `nodejs-backend/` | Present |
| `web-dashboard/` | Present |
| `flutter-app/` | Present |
| `migration/` | Present (RN→Flutter migration evidence) |
| **`mobile-app/` (React Native)** | **Missing.** Referenced by `flutter-app/README.md`, `migration/README.md`, and the headers of `web-dashboard/src/utils/format.ts` and `returnCalculations.ts`. If it still ships to users, it was not audited, and any fix that tightens the API (for example removing anonymous reads) may break it. |
| **Git history** | **Missing.** None of the four folders is a git repository. Changes cannot be diffed, reviewed, or reverted safely. |
| CI / deployment config | Missing: no Dockerfile, pipeline, or IaC. The production topology (proxy, TLS, number of instances, disk persistence) is unknown and affects `P1-3` and `P1-6`. |
| Production database | Not accessed. Index state and data volumes are inferred from code. |

## 2. Method and evidence

| Check | Result |
|---|---|
| Full read of backend: 19 routes, 18 controllers, 19 models, middleware, utils, services, scripts | Done |
| Read of web API layer, contexts, routing, critical pages; Flutter core, controller, API, media, auth | Done |
| **Live reproduction**: scratchpad script ran the unmodified `src/app.js` against `mongodb-memory-server`, with two tenants | 10 of 11 scenarios reproduced (below). The 11th was blocked by the staff limit, which is itself finding `P1-2`. |
| **Advance duplication reproduction** | 3-line order, total 300, advance 250 → recorded advances 750, amount due 0 (correct: 50), 3 invoice numbers |
| `web-dashboard`: `tsc -b` | Pass. Also passes with `--strict` (0 errors). |
| `web-dashboard`: `oxlint` | 0 errors, 15 warnings (mostly `exhaustive-deps` in RentalsPage, ReportsPage, CustomersListPage) |
| `flutter analyze` / `flutter test` | No issues / 12 of 12 passing |
| Secrets check (values not printed) | `JWT_SECRET` is 19 characters. `.env` holds live Atlas credentials. `NODE_ENV` is unset. |

Reproduced scenarios: anonymous `GET /customers` returned both tenants' customers · anonymous `GET /customers/:phone` · anonymous `GET /stats` · request-reset → reset → login as victim · staff created with a foreign `shop_id` read the other tenant · deactivating the tenant's only shop exposed the other tenant · a username taken in tenant A was rejected in tenant B · upload returns an absolute URL bound to the request host · SVG accepted by upload · two concurrent rentals of the last unit both succeeded, and the stock showed 0 (lost update).

## 3. Priority scale

| Level | Meaning | Response |
|---|---|---|
| **P0** | Stop-ship: data breach, account takeover, or silent money loss in the core flow | Fix before anything else; hotfix production |
| **P1** | Serious security, tenant-integrity, stock, or billing defect | Next batch after P0 |
| **P2** | Correctness, performance, or validation defect that users will hit | Planned sprint work |
| **P3** | Architecture, maintainability, testability | Incremental refactor alongside P1/P2 |
| **P4** | UI/UX consistency, design system | After the platform is safe |
| **P5** | Documentation and polish | Continuous |

Effort estimates: **S** ≤ 0.5 day, **M** 1–2 days, **L** 3–5 days, **XL** > 1 week.

---

## 4. Findings

### P0: stop-ship

**P0-1 · Anonymous cross-tenant reads** · Effort S
- Where: `routes/customers.js:17,26`, `routes/equipment.js:45,48`, `routes/categories.js:16`, `routes/settings.js:17-18` use `optionalProtect`; `utils/shopScope.js:12` returns `{}` when `req.shopId` is null; `utils/tenantGuard.js:15` returns `true` for callers without an account; `routes/stats.js:9` has no auth at all.
- Root cause: "legacy compatibility" keeps the old public single-tenant reads. For an anonymous caller that means no filter at all.
- Impact: every tenant's customer names, phone numbers, addresses, ID-document and photo URLs, equipment, prices, and categories can be read without logging in. `GET /equipment/:id` returns any tenant's item by id.
- Fix: `protect` + tenant context on every business route. Delete `optionalProtect`. Put `/stats` behind platform-admin or drop it. Only `/health`, `/ready`, `/plans`, `/catalog`, and the auth endpoints stay public.
- Test: integration suite "anonymous gets 401 on every business route", table-driven over the router stack.

**P0-2 · Unauthenticated account takeover via password reset** · Effort S (lockdown) / M (proper flow)
- Where: `controllers/authController.js:209-243`; clients `web-dashboard/src/api/services/auth.ts:16`, `flutter-app/lib/features/auth.dart:203-208` auto-fill the code.
- Root cause: `reset_code_for_demo` is returned in the response. The code is stored in plain text, never expires, allows unlimited attempts, is rate-limited nowhere, and a 404 reveals whether a username exists.
- Impact: full takeover of any user, including platform admins, given only the username.
- Fix: (1) immediately stop returning the code and disable self-service reset; (2) owner/admin-initiated reset for staff (`PUT /auth/users/:id/password`); (3) owner self-reset via email or SMS with a hashed, single-use token that expires in 15 minutes, rate-limited per IP and per user, with a generic response.
- Decision needed: the delivery channel (§13).

**P0-3 · Tenant scoping fails open when no active shop resolves** · Effort M
- Where: `middleware/tenant.js:37-43` sets `req.shopId = null`; `utils/shopScope.js:12` then yields `{}`; `controllers/authController.js:66` accepts any `shop_id`; `controllers/shopController.js:37` allows deactivating any shop; `deleteShop` doesn't re-pin users.
- Triggers (all reproduced or trivially reachable): a staff user pinned to a shop outside the account or a nonexistent one; a pinned shop deactivated or deleted; the account's only shop deactivated; an account left with zero shops.
- Impact: a logged-in tenant user lists **all tenants'** customers, equipment, rentals, expenses, and invoices. Creates are stamped `shopId: null` and leak into the legacy pool.
- Fix: fail closed. If a tenant user has no resolvable shop, answer 403 `NO_ACTIVE_SHOP`. Validate `shop_id` belongs to the account on user create and update. Forbid deactivating or deleting the last active shop, or a shop with pinned users, unless they are reassigned. Replace `shopScopeFilter` with a helper that **throws** when the scope is missing (§5).

**P0-4 · Legacy mode: users without an `accountId` are unscoped** · Effort M
- Where: `middleware/tenant.js:15-22`, `utils/tenantGuard.js:15`, `subscriptionGate.js` exemptions.
- Who has `accountId: null` today: the super admin from `seedSuperAdmin.js` (role `admin`), any user a platform admin creates through `/auth/signup`, and any orphan from a failed `/auth/register` (non-atomic, `authController.js:99-121`).
- Impact: these users read and write every tenant's data through the normal tenant routes, with no audit trail.
- Fix: run `migrateToTenant` (extended to all collections) wherever legacy data exists, then **remove legacy mode**. Tenant routes require `accountId`; platform admins use `/platform/*` only. Make `/auth/register` a single MongoDB transaction. Remove the unauthenticated first-user bootstrap from `/auth/signup`.

**P0-5 · Bulk rental duplicates the order advance onto every line** · Effort M
- Where: `controllers/rentalController.js:171` (`advanceAmount: advance` inside the per-item loop). Both clients send one order-level advance through `/rentals/bulk` (`CreateRentalModal.tsx:116`, `features/home.dart:869`).
- Evidence: order total 300, advance 250 → stored advances 750, `amount_due` 0 instead of 50.
- Impact: under-billing on every multi-item rental with an advance; inflated "money received" and net-profit reports; 3 invoices for 1 order.
- Fix (short term): split the advance across lines proportionally to estimated line value, reusing the rounding rule in `returnCalculations.ts`, inside a transaction. Fix (target): `RentalOrder` header with lines, one advance, one invoice (RENTAL_FLOW.md §13). Data repair: a script to find bulk-created sibling rentals (same customer, `rentedAt` within the same second, same advance) and report affected invoices for manual review. Do not auto-correct historical invoices.

### P1: serious

**P1-1 · Usernames are unique across the whole platform (user-creation bug, root cause 1)** · Effort M–L, depends on decision
- Where: `models/User.js:5` (`unique: true`); `authController.js:37-38,90-91,377`. Login has no tenant qualifier.
- Symptom: "Username already registered" when a **different** business already uses that name (`admin`, `staff1`, `counter`). Reproduced. It also enables cross-tenant username enumeration, and `ReservationNotice.forUsername` depends on it.
- Fix options (§13 decision): (a) unique `(accountId, username)` + a business code at login; (b) globally unique email for owners/admins, with per-account usernames for staff; (c) keep global usernames but return a clearer message (not recommended). Notices switch to `userId` either way.

**P1-2 · Other user-creation defects (root causes 2–7)** · Effort M
1. The staff limit counts the owner (`authController.js:50`, `usageService.js`): the trial allows owner + **1** member. Reproduced (403 on the second member). Either count non-owners or relabel the limit "users incl. owner" in both UIs.
2. The plan limit is re-implemented inline in `signup` instead of `enforceLimit("staffUsers")`. The two can drift.
3. `shop_id` is unvalidated (`:66`). A foreign id causes `P0-3`. A malformed id surfaces the raw Mongoose cast message.
4. `role: "owner"` in the body is silently downgraded to staff. There is no error.
5. No server-side password policy (web enforces 8, Flutter 8, API accepts 1).
6. Signup returns a **JWT for the newly created user** to the admin who created them. That is a token-handling hazard; return the user DTO instead.
7. `/auth/register` is non-atomic. An orphaned owner blocks the username forever and becomes a legacy superuser (`P0-4`).
8. `PUT /auth/users/username/:username` requires rename **and** new password together. Flutter has no staff management at all.

**P1-3 · Image pipeline (image-issue root causes)** · Effort L. Details in §6.2.
- Absolute host-bound URLs persisted (`routes/upload.js:39`, no `trust proxy`); local ephemeral disk (`app.js:73`); no transformation or thumbnails; any `image/*` including SVG, HEIC, BMP; extension taken from the client filename (`upload.js:12`, falls back to `.bin`); public access to customer ID documents; no tenant ownership or cleanup; Flutter URL joining yields `//static` (`core/widgets.dart:366`, `features/home.dart:633`).

**P1-4 · Stock updates race; no transactions anywhere** · Effort M
- Where: `rentalController.js:107,163,242,348`, `equipmentController.js` (addStock, scrap, sell, maintenance). There is no `startSession` or `withTransaction` in the codebase.
- Evidence: two concurrent rentals of 1 unit both returned 201, and `stock_count` ended at 0. Two rentals exist for one physical unit, and the second decrement was lost.
- Also: bulk creation that fails midway leaves stock decremented without rentals; `DELETE /rentals/:id` on an Active rental never restores stock; completion counts damage as `+1` whatever the quantity.
- Fix: conditional atomic update `findOneAndUpdate({_id, shopId, $expr: {$gte: [{$subtract: ["$stockCount","$damagedCount"]}, qty]}}, {$inc: {stockCount: -qty}})` inside `session.withTransaction` together with the rental and inventory rows. Atlas supports transactions.

**P1-5 · Subscription status not enforced; Stripe upgrade keeps the trial plan** · Effort S–M
- `requireActiveSubscription` is used only in `routes/shops.js`. Expired trials and suspended or canceled tenants keep full use of rentals, customers, and equipment.
- `subscriptionController.js:159` (`activateFromStripeSubscription`) sets `status: active` but never sets `planId`, so paying customers keep trial limits. There is no webhook idempotency (event id log).
- Fix: apply the gate to every tenant write route. Allow reads plus billing and export when lapsed. Map the Stripe price to a Plan on checkout completion and on `customer.subscription.updated`.

**P1-6 · Secrets and auth hardening** · Effort S–M
- `JWT_SECRET` is 19 characters (an HS256 secret can be brute-forced offline from any leaked token). Rotate it to 64 random bytes and validate length at boot.
- No env validation at startup (missing secret surfaces as runtime 401s or 500s).
- Rate limiting covers only login, register, and signup: not `request-reset`, `reset-password`, `upload`, or the general API.
- Tokens live in `localStorage` (web) and `SharedPreferences` (Flutter). There is no revocation on password change. Add `tokenVersion` on the user, move Flutter to `flutter_secure_storage`, and consider an httpOnly cookie for web.
- `errorHandler.js:17` returns raw `err.message` for 500s. `CastError` (bad ObjectId in a URL) becomes a 500 with Mongoose internals.
- `cors({credentials: true})` is unnecessary with bearer tokens.
- `.env` holds live Atlas credentials in the working tree, and there is no git ignore protection because there is no repo. Make sure it never gets committed once git is initialised.

**P1-7 · Cross-tenant foreign-key injection** · Effort S
- `category_id` on equipment create/update, `equipment_id` on expenses and recurring templates, and `customer_id` / `equipment_id` query filters are never checked for ownership. A tenant can attach another tenant's category (its name then leaks through `populate`).
- Fix: `assertOwned(Model, id, req)` for every incoming reference, via the repository layer (§5).

**P1-8 · Anonymous `/stats` platform metrics** · Effort S. Reproduced. Platform-wide record counts are exposed. Remove it or restrict it to platform admins. Fixed together with `P0-1`.

### P2: correctness, performance, validation

**P2-1 · Slow queries and missing indexes.** Details and index plan in §6.3. Effort M.

**P2-2 · Client-side aggregation over capped lists** · Effort L
- Dashboard, Reports, Rentals, and NotificationsBell download 200–1000 rows of 5–7 resources and join them in the browser (`DashboardHomePage.tsx:40-46`, `ReportsPage.tsx:42-61`, `RentalsPage.tsx:40-49`).
- Beyond the caps, names show as unknown and KPIs undercount silently. Each list also triggers a maintenance-log scan server-side.
- The backend already `populate`s customer and equipment on rentals, but `toDto` strips it back to ids.
- Fix: embed `customer {id,name,phone}` and `equipment {id,name}` in rental and invoice DTOs; add `/reports/dashboard` and `/reports/summary` aggregation endpoints; cap `page_size` at 100 on the server.

**P2-3 · Money correctness** · Effort L
- The daily rate is not snapshotted. The return charges the current `rentPerDay` (`rentalController.js:202`), and reprinted invoices recompute gross from the current rate (`invoiceController.js:62`).
- `POST /rentals/:id/payment` stores `discount_amount` without recomputing `amountDue` (`:292`).
- No payment ledger. Revenue date for all post-advance payments is `rental.updatedAt` (`netProfit.js:34,83`), so any later edit moves revenue between periods, and multiple payments collapse into one.
- Advance greater than total: the excess is kept without a refund or credit record.
- The inventory summary adds SALE revenue into "total stock cost" (`inventoryController.js`).
- Numbers are not type-checked. `addStock` with `"5"` does `10 + "5"` → stored 105.
- Recurring expense generation can duplicate under concurrency. There is no unique `(recurringTemplateId, month)` index.
- Floating-point money. Store integer minor units, or at least round every stored value to 2 decimals.

**P2-4 · Validation and error contract inconsistent** · Effort M
- express-validator runs on 9 of 105 route handlers. Most bodies are unchecked (types, ranges, enums, ObjectIds, string lengths).
- 400, 404, and 409 are used inconsistently for the same class of error. Some controllers handle duplicate keys locally; others leak "A record with that field already exists".
- Fix: schema-validated DTOs per route (zod or express-validator schemas), one `AppError` type with codes, and a `CastError` → 400 mapping.

**P2-5 · Phone numbers** · Effort M
- No normalization (E.164) and no format validation, so the same person can be entered twice with different formatting.
- On databases that predate multi-tenancy, the old **global** unique `phone` index survives unless `npm run sync:tenant-indexes` has been run. The script's own header says so. That index makes phone numbers collide across shops.
- Action: check production with `db.customers.getIndexes()`, then add `phoneNormalized` with the tenant-scoped unique index (§5).

**P2-6 · Web shop-switch cache race** · Effort S
- Query keys never include the shop id. `ShopContext` installs the `X-Shop-Id` getter in a `useEffect`, so first-render queries go out without the header (the server falls back to the first shop). An in-flight response from the old shop can land under the shared key after a switch.
- Fix: include `activeShopId` in every tenant query key via a `useTenantQuery` wrapper, and set the getter synchronously.

**P2-7 · Flutter parity gaps** · Effort L. See the matrix in §9.

**P2-8 · Batch return is N client-driven calls** · Effort M
- Web and Flutter call `/complete` once per line after splitting discount and payment client-side. A partial failure leaves a half-returned order.
- The allocation math exists 3 times (backend, `web/utils/returnCalculations.ts`, `flutter/core/models.dart`).
- Fix: `POST /rentals/return` (batch, transactional, server-side allocation). The clients render the server's preview (`POST /rentals/return/preview`).

**P2-9 · Orphaned data on delete** · Effort M
- Deleting equipment, a shop, or an account (platform) leaves related rows and uploaded files behind. `MaintenanceLog` has no tenant key at all.
- Fix: soft-delete by default; hard delete through a job that walks every collection by `accountId` (after §5 adds it); an export-before-delete option for data-protection requests.

### P3: architecture, maintainability, tests

| ID | Finding | Fix | Effort |
|---|---|---|---|
| P3-1 | Controllers mix HTTP, business rules, and data access (`equipmentController.js` 688 lines, `rentalController.js` 416). `routes/stats.js` holds logic inline. DTO mappers duplicated per controller. | `routes/ → controllers/ (HTTP only) → services/ (rules, transactions) → repositories/ (tenant-scoped data access) → models/`, plus `validators/` and `dto/` (§7) | L |
| P3-2 | Zero backend and web tests. `mongodb-memory-server` is installed but undeclared. | Vitest + supertest + mongodb-memory-server (replica set, for transactions); Playwright for web e2e; Flutter `integration_test` (§10) | L |
| P3-3 | No git, CI, lint, or format on the backend. No env schema. No Dockerfile. | Phase 0 (§12) | M |
| P3-4 | TS `strict` off (costs nothing to turn on); 15 hook-deps warnings; `types/models.ts` (455 lines) hand-mirrors backend DTOs; currencies and icons mirrored by hand in 3 codebases. | Turn on `strict`. Publish an OpenAPI spec from backend validators and generate TS and Dart clients/types. Serve currencies and icons from `/catalog` (partly done already). | M–L |
| P3-5 | A multi-item order is N rentals with no order id (N invoices per order). | `RentalOrder` + lines (RENTAL_FLOW.md §13) | XL |
| P3-6 | No structured logging, request ids, or audit trail for platform actions (suspend, delete, plan change). | pino + request id + `AuditLog` collection | M |
| P3-7 | `syncId` UUIDs on every model are unused leftovers from offline sync. | Keep for now; revisit once the RN app is retired | S |

### P4: UI/UX

| ID | Finding | Fix | Effort |
|---|---|---|---|
| P4-1 | 83 `useQuery` calls against about 11 error-state references. Most screens show nothing or stale data on failure. StaffSettings renders empty while loading. | A `<QueryState>` wrapper (loading skeleton, error with retry, empty) used by every list | M |
| P4-2 | No design tokens: raw `slate`/`indigo` classes everywhere; dark mode handled by duplicated class pairs. | Tailwind 4 `@theme` tokens (surface, text, border, primary, danger, success, warning, radius, spacing); migrate the `components/ui/*` primitives first | M |
| P4-3 | Full-size images in 32 px avatars; no `loading="lazy"`, no `onError` fallback; the Flutter customer avatar has a fallback but the web one doesn't. | Shared `<Img>` / `<Avatar>` using thumbnail URLs (§6.2) | S |
| P4-4 | Flutter adds a 1.8 s artificial splash delay on every cold start (`app/controller.dart:34`). | Remove it or make it show only on first launch | S |
| P4-5 | Web and Flutter visual parity has not been verified (migration doc: goldens and devices "NOT RUN"). Responsive behaviour of the web tables on phones is unverified. | Golden tests; Playwright viewport snapshots at 375, 768, and 1280 px | M |
| P4-6 | Staff see admin-only actions in Flutter and get raw 403 toasts. | Role-aware UI from one permission map (§9) | M |

### P5: docs and polish

- The backend README is stale: it calls the web dashboard an internal operator console without signup, and lists GET routes as public. Rewrite it after P0.
- Remove `scripts/_e2e_server.tmp.js` and declare dev dependencies.
- Delete `reset_code_for_demo` handling from both clients once `P0-2` ships.
- Add an OpenAPI reference, runbooks (seed, migrate, rotate secrets, restore backup), and ADRs for tenancy and identity.

---

## 5. Multi-tenancy target design

Goal: a tenant can never read or write another tenant's data, even when a developer forgets a filter.

The tenant boundary is the **Account**. Shops are isolated branches inside it. This assumes "shop = tenant" in the request means one business signup; see decision D1 in §13.

### 5.1 API layer
1. `requireTenant` middleware replaces `attachTenantContext` and fails closed. It produces an immutable `req.tenant = { accountId, shopId, shopIds, role, userId }`. It returns 401 with no user, 403 `NO_ACCOUNT` with no account, 403 `NO_ACTIVE_SHOP` when no shop resolves, and 402 when the subscription has lapsed (writes only).
2. **Repository layer** is the only code that touches tenant models: `repo.customers(req.tenant).find(filter)` always merges `{ accountId, shopId }`, and `findById` becomes `findOne({ _id, accountId, shopId })`. Controllers never import models directly (enforced with a lint rule that bans `models/*` imports outside `repositories/`).
3. `assertOwned(ref)` runs on every incoming foreign key (category, equipment, customer, rental, shop, user).
4. The platform console uses separate `/platform/*` routes and services. Tenant routes never accept a platform admin without an account.

### 5.2 Database layer
1. Add a required `accountId` to every tenant-owned collection, including `MaintenanceLog`, alongside `shopId`. Backfill it from `shopId → Shop.accountId`.
2. A Mongoose **tenant plugin** as a second line of defence: `pre(find*, count*, update*, delete*, aggregate)` hooks throw if the query has no `accountId` (with an explicit, greppable escape hatch for platform jobs).
3. A MongoDB `$jsonSchema` validator on each collection requiring `accountId` and `shopId` to be ObjectIds, so writes that bypass Mongoose are blocked too.
4. Tenant-scoped unique indexes. These are what stop users, customers, and phone numbers from colliding across shops:

| Collection | Unique index | Partial filter |
|---|---|---|
| users | `{ accountId: 1, username: 1 }` (if D2 = per-account usernames) | – |
| customers | `{ accountId: 1, shopId: 1, phoneNormalized: 1 }` | `isArchived: false` |
| categories | `{ accountId: 1, shopId: 1, name: 1 }` with collation `{ locale: "en", strength: 2 }` | `isArchived: false` |
| equipment | `{ accountId: 1, shopId: 1, name: 1 }` with collation strength 2 (replaces the racy regex check) | `isArchived: false` |
| expenses | `{ recurringTemplateId: 1, periodKey: 1 }` | `recurringTemplateId exists` |
| rentals | `{ accountId: 1, invoiceNumber: 1 }` | `invoiceNumber exists` |

5. Migration order: backfill `accountId` → create the new indexes (on Atlas, build them before deploying code that needs them) → deploy code → drop the stale global indexes (`syncTenantIndexes` extended to every model).

---

## 6. Deep dives

### 6.1 User creation: root causes

| # | Root cause | Code | Visible symptom | Fix |
|---|---|---|---|---|
| 1 | Global unique username | `models/User.js:5` | "Username already registered" for a name used by another business | Scoped identity (D2) |
| 2 | Staff limit counts the owner | `authController.js:50` | Trial: second team member rejected | Count non-owners, or relabel |
| 3 | `shop_id` unvalidated | `authController.js:66` | Cast error text, or the new user sees all tenants | Validate against `req.tenant.shopIds` |
| 4 | Non-atomic register | `authController.js:99-121` | Retry after a failure says the username is taken; orphaned superuser | Transaction |
| 5 | No server password policy | – | Weak passwords through the API | Min 8, max 128, reject common passwords |
| 6 | Role silently downgraded; token returned for the new user | `authController.js:41,69` | Confusing results | Explicit 400; return the DTO only |
| 7 | Duplicated limit logic; Flutter lacks user management | `authController.js:44-58` | Limits disagree between UIs | Use `enforceLimit`; one users service |

### 6.2 Images: root causes

| # | Root cause | Code | Symptom | Fix |
|---|---|---|---|---|
| 1 | **Absolute URL built from the request host and saved in the database** | `upload.js:37-39` | Uploaded from web (`localhost:5000`): broken on Android (`10.0.2.2`) and in production. Uploaded from mobile: broken on web. Behind a TLS proxy, `req.protocol` is `http` because there is no `trust proxy`, so browsers block the image as mixed content. | Store the object **key** (`<accountId>/<uuid>.webp`). DTOs resolve it to a URL with `PUBLIC_ASSET_BASE_URL` at read time. A migration rewrites existing URLs to keys. |
| 2 | Local disk storage | `app.js:73`, `uploads/` | Images vanish after a redeploy on ephemeral hosts and aren't shared across instances | S3-compatible object storage (D4) behind a `StorageService` interface; local driver for dev |
| 3 | No processing | – | Up to 576 KB originals rendered as 32 px thumbnails; slow lists on mobile data | `sharp`: strip EXIF (privacy), auto-rotate, re-encode to WebP, write `thumb` (256 px) and `full` (1600 px) |
| 4 | Weak type checks | `upload.js:12,21` | SVG accepted (script vector); HEIC stored, and Chrome and Firefox can't display it; no extension → `.bin`, which the PDF logo loader drops | Allow-list JPEG, PNG, WebP, HEIC by **magic bytes**; convert HEIC; ignore the client filename |
| 5 | Public, unauthenticated, not tenant-owned | `app.js:73` | Customer ID documents downloadable by anyone with the URL; no deletion when the record is deleted | Private bucket + short-lived signed URLs for documents; `Upload` records (accountId, kind, ownerRef) for cleanup |
| 6 | Client URL handling | `flutter core/widgets.dart:366`, `features/home.dart:633`; web `<img>` without `onError` | `//static/...` 404 once URLs become relative; blank tiles on web | One shared resolver per client + a placeholder fallback |
| 7 | No client-side limits on web | `ImageUpload.tsx` | 10 MB phone photos uploaded as is | Resize before upload (canvas) and check the size first |

### 6.3 Slow queries and index plan

Hot paths without a supporting index:

| Query (file) | Problem | Index to add |
|---|---|---|
| `MaintenanceLog.find({equipmentId: {$in}})` on every equipment list and get (`equipmentController.js:32,49`) | **Collection scan.** No `equipmentId` index. | `{ equipmentId: 1, createdAt: -1 }` (and move logs out of the list DTO) |
| Rentals by shop + status, sorted by `rentedAt` / `returnedAt` (`rentalController`, `invoiceController`) | Only `{status, rentedAt}` without shop | `{ shopId: 1, status: 1, rentedAt: -1 }`, `{ shopId: 1, status: 1, returnedAt: -1 }`, `{ shopId: 1, customerId: 1, status: 1 }`, `{ shopId: 1, equipmentId: 1, status: 1 }` |
| Net profit: `$or: [{rentedAt}, {updatedAt}]` per shop (`netProfit.js`) | Scans all shop rentals; runs twice (total and per-equipment) | `{ shopId: 1, updatedAt: -1 }` now; a payment ledger later removes the `$or` |
| InventoryTransaction by `equipmentId $in` (depreciation) and by shop sorted by date | No `equipmentId` index | `{ equipmentId: 1, createdAt: 1 }`, `{ shopId: 1, createdAt: -1 }` |
| Expenses list and recurring check | No compound index | `{ shopId: 1, isArchived: 1, date: -1 }`, `{ recurringTemplateId: 1, date: -1 }` |
| Customer and equipment search: `$regex` with user input, unanchored, case-insensitive (`customerController.js:13`, `equipmentController.js:18`) | Can't use an index, and the input isn't escaped (**ReDoS / regex injection**) | Escape the input. Anchored prefix search on `nameLower` / `phoneNormalized` with `{ shopId: 1, nameLower: 1 }`, or Atlas Search |
| Lists without paging parameters return everything; `page_size` has no maximum | Unbounded responses | Default 20, maximum 100, always paginate |
| `attachTenantContext`: 4 sequential queries per request (user, account and shops, subscription, plan) | Latency on every call | Promise.all + a 30–60 s in-process cache for plan and subscription |
| Equipment sales summary: 2 separate aggregations over the same match | Double scan | One `$facet` |

Verify on Atlas first: turn on the Profiler (slowms 100), take a Performance Advisor snapshot, and run `explain("executionStats")` for the top 5 routes. Confirm before and after each index batch.

---

## 7. Backend target structure

```
src/
  app.js                 # wiring only
  config/env.js          # zod-validated env, fail fast
  routes/<resource>.routes.js      # path + middleware + validator + controller
  controllers/<resource>.controller.js   # HTTP in/out only
  services/<resource>.service.js   # business rules, transactions, no req/res
  repositories/<resource>.repo.js  # tenant-scoped data access (only place models are used)
  validators/<resource>.schema.js  # request schemas → also feed OpenAPI
  dto/<resource>.dto.js            # single mapper per entity
  middleware/{auth,requireTenant,rbac,subscription,rateLimit,errorHandler,requestId}.js
  lib/{AppError,money,phone,storage,pdf,logger}.js
  models/  (+ plugins/tenant.js)
tests/{unit,integration,e2e-fixtures}
```

The refactor goes resource by resource, starting with the P0/P1 surfaces: auth/users → customers → equipment and stock → rentals → invoices. Each resource keeps the same API contract and is covered by integration tests **before** it moves.

## 8. Web target structure (React + TS)

- `strict: true`, plus `noUncheckedIndexedAccess`.
- Types generated from OpenAPI (`openapi-typescript`) instead of hand-written `models.ts`.
- `api/` stays the single HTTP layer. Add a `useTenantQuery(key, fn)` wrapper that injects `activeShopId` into keys, and a `queryKeys` factory.
- A feature-folder layout (`features/rentals/{api,components,hooks,pages}`) for the large pages. Break up pages over 300 lines (Equipment list 446, Categories 425, Expenses 415, Reports 408).
- Business math only on the server. The clients show server-computed previews.
- A `<QueryState>`, `<Img>`/`<Avatar>`, and `<PermissionGate>` primitive, and design tokens (P4).

## 9. Flutter parity matrix (web rules → Flutter)

| Rule | Web | Flutter | Action |
|---|---|---|---|
| Sends `X-Shop-Id`, shop switcher | Yes | **No** | Add a shop selector + header |
| Role-gated screens and actions | `RequireRole` on reports, billing, settings | **None** (role stored, never read) | Shared permission map served by `/auth/me` |
| Staff management | Yes | **No** | Add |
| Shop management | Yes | **No** | Add (owner/admin) |
| 401 → logout | Global interceptor | **No global handler found** | Add in `ApiClient.decode` |
| Password minimum 8 | Client-side | Client-side | Enforce server-side (`P1-2`) |
| Return and batch allocation math | `returnCalculations.ts` | `core/models.dart` | Both use the server preview (`P2-8`) |
| Image URL resolution | Uses the stored absolute URL | Prefixes `API_URL` (double slash) | Both use the server-resolved URL (`P1-3`) |
| Token storage | `localStorage` | `SharedPreferences` | `flutter_secure_storage` |

## 10. Test strategy (critical flows first)

| Layer | Tooling | First suites (in order) |
|---|---|---|
| Backend integration | Vitest + supertest + mongodb-memory-server **replica set** | 1. Tenant isolation matrix: every route × {anonymous, tenant A, tenant B, staff pinned, platform admin}. 2. Auth: register atomicity, login, reset lockdown, user CRUD. 3. Rental lifecycle: create single/bulk (advance split), concurrency (oversell), complete (money formula table), payment, cancel, delete. 4. Uploads. 5. Subscription gates. |
| Backend unit | Vitest | Money formulas, depreciation lots, invoice numbering, phone normalization, scope helper throws without a tenant |
| Web unit/component | Vitest + Testing Library + MSW | Auth and shop context, `useTenantQuery` keys, forms (customer, equipment, rental, return) |
| Web e2e | Playwright against the backend + memory DB | signup → category → equipment → customer → rent (2 items + advance) → return → invoice PDF; staff permission denial; shop switch isolation |
| Flutter | `flutter_test` + `integration_test` | Keep the 12 existing tests. Add the same e2e journey, the 401 handler, shop header, and role gating. |
| CI | GitHub Actions (or equivalent) | lint + typecheck + unit + integration on every PR; e2e nightly |

Target coverage for the first milestone: every P0/P1 fix ships with a failing-then-passing test. The scratchpad reproduction scenarios become the first integration tests.

## 11. Security checklist status

| Control | Status |
|---|---|
| AuthN on business routes | **Fail** (`P0-1`) |
| Tenant isolation | **Fail** (`P0-3`, `P0-4`, `P1-7`) |
| RBAC server-side | Partial: roles are checked, but staff can create categories and edit any expense or customer; there's no field-level rule for money edits (for example a staff member changing `advance_amount` on an active rental) |
| Password reset | **Fail** (`P0-2`) |
| Password storage | Pass (bcrypt cost 12) |
| Password policy | Fail (server) |
| Session management | Weak (no revocation; 7-day tokens in localStorage) |
| Input validation | Weak (9 of 105 route handlers) |
| NoSQL injection | Mostly mitigated by `express-mongo-sanitize`; regex injection open (`P2-1`) |
| Rate limiting | Partial (4 auth routes) |
| Secrets | Weak JWT secret; no env validation |
| Security headers | Pass (helmet) |
| CORS | OK (allow-list); drop `credentials` |
| File uploads | **Fail** (SVG, public PII, no sniffing) |
| Error leakage | Fail (raw 500 messages) |
| Audit logging | Missing |
| Dependency scanning | Missing (no `npm audit` in CI) |
| Stripe webhook | Signature verified; idempotency missing; plan mapping bug |

## 12. Phased implementation plan

Each batch is small, ships behind tests, and ends with the list of files changed and the verification output.

| Phase | Batch | Contents | Depends on |
|---|---|---|---|
| **0** | 0.1 | `git init` for each project (or a monorepo) and a baseline commit; `.gitignore` check that `.env` is excluded | – |
| | 0.2 | Backend test harness (Vitest, supertest, memory replica set) + turn the reproduction scenarios into **failing** tests | 0.1 |
| **1 (P0)** | 1.1 | Remove anonymous access (`P0-1`, `P1-8`) | 0.2 |
| | 1.2 | Lock down reset: no code in the response, rate limit, admin-initiated staff reset (`P0-2`, part 1) | 0.2 |
| | 1.3 | Fail-closed tenant context + `shop_id` validation + shop deactivate/delete guards (`P0-3`) | 1.1 |
| | 1.4 | Atomic register; remove legacy mode and the first-user bootstrap; platform admin limited to `/platform` (`P0-4`) | 1.3 + D1 |
| | 1.5 | Bulk advance split + affected-order report script (`P0-5`) | 0.2 |
| **2 (P1)** | 2.1 | Atomic stock + transactions (`P1-4`) | 1.x |
| | 2.2 | Subscription gate on writes + Stripe plan mapping (`P1-5`) | 1.3 |
| | 2.3 | Env validation, secret rotation, error handler, rate limits, `tokenVersion` (`P1-6`) | – |
| | 2.4 | `assertOwned` on every reference (`P1-7`) | 1.3 |
| | 2.5 | User identity model + user service + password policy (`P1-1`, `P1-2`) | D2 |
| | 2.6 | Image pipeline: keys, storage driver, sharp, allow-list, signed document URLs, URL migration (`P1-3`) | D4 |
| **3 (P2)** | 3.1 | `accountId` backfill + tenant plugin + scoped unique indexes + query indexes (§5, §6.3) | 1.4 |
| | 3.2 | Validation schemas + AppError contract (`P2-4`) | – |
| | 3.3 | Phone normalization (`P2-5`) | 3.1 |
| | 3.4 | Embedded DTO summaries + aggregate report endpoints + page caps (`P2-2`) | – |
| | 3.5 | Rate snapshot, payment ledger, server batch return (`P2-3`, `P2-8`) | 2.1 |
| **4 (P3)** | 4.x | Routes/controllers/services/repositories split per resource; OpenAPI; generated TS and Dart types; TS strict; Flutter parity items | 3.x |
| **5 (P4)** | 5.x | Tokens, `QueryState`, image components, responsive pass, Flutter splash, goldens | 2.6 |
| **6 (P5)** | 6.x | README for each project, API reference, runbooks | continuous |

## 13. Decisions needed before Phase 1.4 / 2.x

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Tenant boundary | (a) Account = tenant, shops are branches of one business (current model); (b) every shop fully isolated, even within one business | (a). The request says "shops are tenants"; please confirm that means one business signup, not each branch. |
| D2 | Login identity | (a) per-account usernames + a business code at login; (b) global email for owners/admins, per-account usernames for staff; (c) keep global usernames | (b) |
| D3 | Password-reset delivery | email; SMS OTP; owner-mediated only | Owner or admin resets staff; email for owners |
| D4 | Image storage | S3 / Cloudflare R2 / DO Spaces; persistent volume on the current host; GridFS | S3-compatible (R2 has no egress fees) |
| D5 | React Native `mobile-app` | still shipped (must stay compatible) / retired in favour of Flutter | Needed before 1.1: removing anonymous reads may break old RN builds |
| D6 | Customer uniqueness scope | per shop (current) / per account (shared across branches) | Per account, with shop-level visibility rules |
