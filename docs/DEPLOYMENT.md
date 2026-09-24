# Deployment and Operations

This runbook covers the first production deploy of the hardened version and routine operations afterwards. Every data-changing step is explicit and has a dry run.

## 1. What runs where

| Component | Runs as | Needs |
|---|---|---|
| API (`nodejs-backend`) | Container (`nodejs-backend/Dockerfile`) or `node server.js` on Node 24 | MongoDB replica set (Atlas works), a persistent volume or S3 bucket for files, optional SMTP and Stripe |
| Web (`web-dashboard`) | Static files behind nginx (`web-dashboard/Dockerfile`) or any static host | `VITE_API_URL` at build time |
| Mobile (`flutter-app`) | App store builds | `--dart-define=API_URL=https://api.example.com/` at build time |

## 2. Environment variables (API)

All are validated at startup; see [`nodejs-backend/.env.example`](../nodejs-backend/.env.example) for the full list. The important ones:

| Variable | Production value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas SRV string (replica set, so transactions work) |
| `JWT_SECRET` | At least 32 random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `CORS_ORIGINS` | Your web app origin(s), comma-separated |
| `PUBLIC_API_URL` | `https://api.example.com` (used for file links) |
| `TRUST_PROXY` | Number of proxies in front (e.g. `1` behind a load balancer) |
| `FRONTEND_URL` | Web app URL (reset links, Stripe redirects) |
| `STORAGE_DRIVER` | `s3` (recommended) or `local` with a persistent volume |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | For `s3`; optional `S3_PUBLIC_BASE_URL` for a CDN in front of public images |
| `STORAGE_LOCAL_DIR`, `LEGACY_UPLOADS_DIR` | For `local`: paths on the persistent volume |
| `SMTP_URL`, `MAIL_FROM` | Needed for self-service password reset emails |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Only if Stripe billing is used |

## 3. First deploy of this version (existing data)

This version needs data migrations before it can serve existing data (every record gets its business id, usernames become unique per business, phone numbers and names get comparison keys, indexes are rebuilt). **The API refuses to start in production while required migrations are pending.**

1. **Rotate `JWT_SECRET`.** The current one is too short for production. Rotating signs everyone out once.
2. **Back up the database.** Take an Atlas snapshot (or `mongodump`) and confirm it can be restored.
3. **If you still have pre-SaaS data** (users or records with no business): run `npm run migrate:tenant -- "Company Name"` first. Migration 001 stops and says so if this is needed.
4. **Dry run** against production (read-only):
   ```bash
   cd nodejs-backend
   MONGODB_URI="<production uri>" npm run migrate
   ```
   It prints what each migration would change.
5. **Apply:**
   ```bash
   MONGODB_URI="<production uri>" npm run migrate -- --apply
   ```
   If migration 003 reports duplicate groups (two active customers with the same phone number in one shop, or two categories/items with the same name ignoring case), merge or archive them in the current app and re-run. Nothing later runs until 003 is clean. The runner is idempotent: applied migrations are skipped.
6. **Optional:** copy older payments into the ledger so every report uses one source:
   ```bash
   MONGODB_URI="<production uri>" npm run migrate -- --apply --include-optional
   ```
7. **Files.** Existing images in `nodejs-backend/uploads/` must stay reachable: keep that folder on the persistent volume and point `LEGACY_UPLOADS_DIR` at it. With `STORAGE_DRIVER=s3`, also copy the folder into the bucket under the `legacy/` prefix (`aws s3 sync uploads/ s3://<bucket>/legacy/`).
8. **Deploy the API**, then check `GET /ready` returns `{"status":"ready"}`.
9. **Deploy the web app** built with the production `VITE_API_URL`.
10. **Release the mobile app** built with the production `API_URL`. Older mobile builds keep working for logged-in use, but their password reset screen no longer receives a code.
11. **Tell business owners their business code** (shown in Settings → Company and on the Team screen). Staff only need it when their username is also used by another business.

## 4. New environment (empty database)

```bash
npm run migrate -- --apply     # records the migrations as applied and builds indexes
npm run seed:plans             # plan catalog (edit scripts/seedPlans.js first)
npm run seed:super-admin       # operator login; prints a generated password once
```

## 5. Routine operations

| Task | How |
|---|---|
| Health | `GET /health` (process), `GET /ready` (database). The Docker images have health checks. |
| Logs | JSON (pino) on stdout, one line per request with `reqId`, status and duration. Search by the `X-Request-Id` a user reports. |
| Add an operator | `npm run promote:platform-admin -- <username> [--business <code>]` |
| Operator locked out | `npm run reset:password -- <username> <new password>` (signs them out everywhere) |
| Change plans or prices | Platform console → Plans, or edit `scripts/seedPlans.js` and run `npm run seed:plans` |
| Rotate `JWT_SECRET` | Update the secret and restart; all users sign in again |
| Rotate file-link secret | Set `FILE_SIGNING_SECRET`; existing private links stop working (clients get new ones on refresh) |
| Wipe a disposable dev database | `node scripts/wipeDatabase.js` (refuses production and non-local databases) |

## 6. Scaling

- The API is stateless apart from rate-limit counters (per process) and, with the `local` driver, files. Before running more than one instance, use `STORAGE_DRIVER=s3` and add a shared rate-limit store (for example `rate-limit-redis` in `src/middleware/rateLimit.js`).
- Indexes for every hot query are defined in the models and built by migration 004; run `npm run migrate -- --apply` after deploying a version that adds indexes (autoIndex is off in production).
- Recurring expenses are generated when the expense list is read; no background worker is needed.

## 7. Stripe (optional)

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, add each paid plan's Stripe price id (Platform console → Plans), and point a Stripe webhook at `POST https://api.example.com/subscription/webhook` for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` and `invoice.payment_failed`.

## 8. Mobile release checklist

- `flutter build appbundle --release --dart-define=API_URL=https://api.example.com/` (Android) and the iOS equivalent.
- The Android release build is currently signed with the debug key; configure a release keystore in `android/app/build.gradle.kts` before publishing.
- Update the version in `pubspec.yaml`.

## 9. Local stack

`docker compose up --build` starts MongoDB (single-node replica set), the API, the web app and Mailpit for reset emails. See the root [README](../README.md).
