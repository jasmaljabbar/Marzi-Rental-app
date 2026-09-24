# Rental Manager API

Node 24 + Express 4 + MongoDB (Mongoose 8). Multi-tenant REST API for the web dashboard and the mobile app.

## Run locally

Quickest way, with no Docker and no MongoDB install:

```bash
npm install
npm run dev:local           # http://localhost:5000, Ctrl+C to stop
```

This starts a private MongoDB replica set whose data is kept in `.dev-db/` between runs, applies the migrations, seeds the plans and runs the API with auto-reload. It ignores `MONGODB_URI` from `.env`, so it can never write to a shared or production database. `npm run dev:local -- --reset` starts from an empty database. Create a business from the web app's Sign up page or the mobile app's "Create a business account".

> `npm run dev` uses `MONGODB_URI` from `.env` as is. Do not point `.env` at a production database on a development machine: in development the API builds indexes at startup, and every signup or edit you make is written there.

With your own MongoDB, it must run as a replica set (transactions depend on it). The easiest way is `docker compose up mongo` from the repository root.

```bash
cp .env.example .env        # set MONGODB_URI and JWT_SECRET at least
npm install
npm run migrate -- --apply  # empty database: records migrations and builds indexes
npm run seed:plans          # plan catalog (signup needs the "trial" plan)
npm run seed:super-admin    # operator login for /platform (prints the password once)
npm run dev                 # http://localhost:5000
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev:local [-- --reset]` | Start a local database and the API with auto-reload (development only) |
| `npm run dev` / `npm start` | Start the API against `MONGODB_URI` (with / without auto-reload) |
| `npm test` | Integration tests on an in-memory MongoDB replica set |
| `npm run test:coverage` | Same, with a coverage report |
| `npm run lint` | Syntax check of every source file |
| `npm run migrate [-- --apply] [--include-optional]` | Data migrations; dry run unless `--apply` (see [DEPLOYMENT.md](../docs/DEPLOYMENT.md)) |
| `npm run migrate:tenant -- "Company"` | Wrap pre-SaaS data into a business (run before `migrate` if needed) |
| `npm run seed:plans` | Create or update the plan catalog |
| `npm run seed:super-admin` | Create the first platform operator |
| `npm run promote:platform-admin -- <user> [--business <code>] [--revoke]` | Grant/revoke operator access |
| `npm run reset:password -- <user> <password> [--business <code>]` | Set a password directly (signs the user out everywhere) |

## Layout

```
server.js            startup: env validation, DB connect, pending-migration check, graceful shutdown
src/app.js           Express app factory
src/config/          env schema, currencies, category icons, plan catalog
src/routes/          endpoint → middleware → zod validator → controller
src/validators/      request schemas
src/controllers/     HTTP in/out
src/services/        business rules and transactions
src/dto/             response mappers
src/models/          Mongoose schemas, indexes, tenant guard plugin
src/storage/         file storage (keys, local/S3 drivers, image processing, signed links)
src/middleware/      auth, tenant context, roles, subscription gates, rate limits, errors
src/lib/             shared helpers (errors, validation, pagination, transactions, money, tokens, mail)
src/migrations/      ordered data migrations
tests/               node:test suites (+ e2e-server.js used by the web app's Playwright tests)
```

## Key rules

- Every business route needs a login and resolves one business and shop; there's no anonymous or unscoped access. See [SECURITY.md](../docs/SECURITY.md).
- Money and stock changes run in MongoDB transactions with atomic stock updates.
- The database stores file keys; URLs are generated per request.

Full endpoint list: [API.md](../docs/API.md). Architecture: [ARCHITECTURE.md](../docs/ARCHITECTURE.md). Business flow: [RENTAL_FLOW.md](../docs/RENTAL_FLOW.md).
# API documentation and demo testing

The complete Postman collection, seeded environment, request schemas, response
examples and verification results are in [`.postman/README.md`](.postman/README.md).
Run `npm run docs:postman` to regenerate the reference, `npm run test:postman`
to exercise every route against an isolated database, or `npm run seed:demo`
to create a new demo business in the configured MongoDB database.
