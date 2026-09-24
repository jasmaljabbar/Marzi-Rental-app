# Security Model

## Tenant isolation

Each business (Account) is a tenant; its shops are branches. Isolation is enforced in three layers:

1. **Request context.** `requireTenant` resolves the business and the active shop from the logged-in user and refuses the request (403) when either can't be resolved, when a staff member's pinned shop is inactive, or when `X-Shop-Id` names a shop the user can't access. There is no fallback to unscoped data.
2. **Service layer.** Queries are built with `lib/tenantScope.js`. Lookups by id include the business and the accessible shops, so another business's record reads as "not found". Referenced ids (category, customer, equipment, uploaded files) are verified to belong to the caller's business.
3. **Database guard.** The `tenantGuard` Mongoose plugin throws on any query or aggregation on a tenant collection that doesn't filter by `accountId`. Operator code opts out explicitly and greppably (`skipTenantCheck`).

Uniqueness rules are scoped per business or shop (usernames, phone numbers, category/equipment names, invoice numbers), so businesses never collide.

Tests: `nodejs-backend/tests/tenancy.test.js` (anonymous access to every route, cross-business reads and writes, foreign shop ids, pinned staff, deactivated shops, platform admins on tenant routes, the guard) and the Playwright tenancy journey.

## Authentication

- Passwords: bcrypt (cost 12). Policy: 8–128 characters, not a common password, not a repeated character, not the username (enforced on the server; mirrored in both clients).
- Sessions: HS256 JWT with `sub` and a token version. A password change, admin reset, role or shop change, or removal increments the version and ends existing sessions. Staff sessions last 8 hours, others 7 days.
- Login answers wrong-password and unknown-user attempts identically (same message, same bcrypt cost).
- Password reset: a random 256-bit token, stored only as a SHA-256 hash, valid 15 minutes, single use, delivered by email. The API never returns a code and gives the same answer whether or not the account exists. Staff without an email are reset by their owner or admin; platform admins by the `reset:password` CLI.
- Tokens are kept in the OS keystore on mobile (flutter_secure_storage) and in `localStorage` on the web. Because the web app keeps its token in `localStorage`, it depends on preventing XSS (React escaping, no `dangerouslySetInnerHTML`, strict file handling, CSP on file responses).

## Permissions

| Action | Staff | Admin | Owner |
|---|:-:|:-:|:-:|
| View dashboard, rentals, customers, equipment, expenses, invoices | ✓ | ✓ | ✓ |
| Create customers, rentals; take returns and payments; cancel rentals | ✓ | ✓ | ✓ |
| Add stock, report damage/repair, add expenses | ✓ | ✓ | ✓ |
| Create/edit/archive/delete equipment and categories; sell or scrap | | ✓ | ✓ |
| Archive/delete customers, delete rentals, edit/delete expenses | | ✓ | ✓ |
| Reports (summary, net profit, payments), settings, company details | | ✓ | ✓ |
| Shops and team management | | ✓ | ✓ |
| Billing actions | | ✓ | ✓ |
| Change or remove the owner | | | — (protected) |

Platform operators (`isPlatformAdmin`) use `/platform/*` only; without a business they are refused on business routes.

Plan rules sit on top: numeric limits (`enforceLimit`), feature flags (`requireFeature`), and read-only access when a trial has ended or the business is suspended (`requireWritableSubscription`).

## Input validation and errors

- Every route validates params, query and body with zod schemas (types, ranges, enums, ObjectIds, lengths). Numbers sent as strings are coerced, never concatenated.
- `express-mongo-sanitize` strips `$` and `.` keys; search input is escaped before use in regular expressions and capped at 100 characters.
- One error format (`{ detail, code }`). Unexpected errors are logged with the request id and answered with a generic message in production.

## Files

- Uploads must declare an image type and extension, and are then decoded by sharp and re-encoded to WebP; SVG, HEIC, damaged files and non-images are refused whatever they claim to be. EXIF (including GPS) is stripped. Size limit 10 MB, one file per request. Keys are namespaced by business (`t/<accountId>/…`) and random, so one business's upload can never overwrite another's.
- Customer photos, ID documents, receipts and damage photos are private: they are only served through HMAC-signed links that expire (1–1.5 hours). File responses carry `Content-Security-Policy: default-src 'none'; sandbox` and `nosniff`.
- A document can only reference files uploaded by the same business with an allowed kind.

## Transport and headers

- `helmet` security headers, no `X-Powered-By`, CORS allow-list from `CORS_ORIGINS` (outside production, any `http://localhost:<port>` is also allowed so `flutter run -d chrome` works on its random port; production accepts only the listed origins). The web container's nginx adds `X-Frame-Options: DENY`, `Referrer-Policy` and `Permissions-Policy`.
- Set `TRUST_PROXY` to the number of proxies in front of the API so client IPs (rate limits) and `https` links are correct.

## Rate limiting

| Scope | Default |
|---|---|
| All API requests per IP | 1000 per 15 minutes (`RATE_LIMIT_MAX`) |
| Login, signup, admin login, password change | 20 per 15 minutes (`AUTH_RATE_LIMIT_MAX`) |
| Password reset requests | 5 per hour |
| Uploads | 120 per 15 minutes |

Counters are per process. Behind several API instances, add a shared store (see [DEPLOYMENT.md](DEPLOYMENT.md#scaling)).

## Secrets

- All configuration is validated at startup (`src/config/env.js`). In production `JWT_SECRET` must be at least 32 characters.
- `.env` files are git-ignored; `.env.example` documents every variable.
- `FILE_SIGNING_SECRET` defaults to a value derived from `JWT_SECRET`; set it separately to rotate one without the other.

## Data protection

- Deleting a business from the platform console removes every tenant collection and its stored files.
- Customer ID documents are private files; logs redact authorization headers, passwords and tokens.

## Reporting a vulnerability

Contact the platform operator privately; don't open a public issue. Include the request id (`X-Request-Id`) if you have one.
