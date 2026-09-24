# Rental Manager

A multi-tenant SaaS for equipment rental businesses. Each business (tenant) runs one or more shops. Staff rent equipment to customers, take returns, collect payments, and track stock, expenses and profit. Owners manage their team, settings and plan. The platform operator manages every business from a separate console.

| Folder | What it is | Stack |
|---|---|---|
| [`nodejs-backend/`](nodejs-backend/README.md) | REST API, business rules, PDFs, file storage, billing | Node 24, Express 4, MongoDB (Mongoose 8), zod, sharp |
| [`web-dashboard/`](web-dashboard/README.md) | Web app for businesses, plus the platform console under `/platform` | React 19, TypeScript (strict), Vite, TanStack Query, Tailwind 4 |
| [`flutter-app/`](flutter-app/README.md) | Mobile app for counter staff and owners (Android, iOS, web) | Flutter 3.44 / Dart 3.12 |
| [`docs/`](docs) | Architecture, business flow, API, security, deployment, audit | — |
| [`migration/`](migration/README.md) | Evidence from the React Native → Flutter migration | — |

## Quick start (local)

With Docker:

```bash
docker compose up --build
docker compose exec api npm run seed:plans          # plan catalog, needed before anyone can sign up
docker compose exec api npm run seed:super-admin    # operator login for /platform
```

- Web app: http://localhost:8080 (sign up to create a business)
- API: http://localhost:5000 (`/health`, `/ready`)
- Emails (password reset links): http://localhost:8025

Without Docker (no MongoDB install needed; the API runs its own local database, kept in `nodejs-backend/.dev-db/`):

```bash
cd nodejs-backend && npm install && npm run dev:local                               # API on http://localhost:5000
cd web-dashboard && cp .env.example .env && npm install && npm run dev            # http://localhost:5174
cd flutter-app && flutter pub get && flutter run -d chrome --dart-define=API_URL=http://localhost:5000/
```

For the Android emulator use `API_URL=http://10.0.2.2:5000/`; see [flutter-app/README.md](flutter-app/README.md#run-against-a-local-api) for other targets. To use your own MongoDB instead, it must run as a replica set (transactions depend on it), then `npm run migrate -- --apply && npm run seed:plans && npm run dev`. Never point a development `.env` at the production database.

## Tests

| Project | Command | What runs |
|---|---|---|
| API | `cd nodejs-backend && npm test` | 104 integration tests against an in-memory MongoDB replica set (tenancy, auth, money, stock, uploads and photo limits, reports, subscriptions, migrations). `npm run test:coverage` for coverage (about 94% of lines). |
| Web | `cd web-dashboard && npm test` | 52 unit and component tests (Vitest, Testing Library, MSW) |
| Web end-to-end | `cd web-dashboard && npm run test:e2e` | Playwright against the real API and an in-memory database: full rental journey, customer photos and multi-photo equipment, tenant isolation, staff permissions, phone-size layout |
| Mobile | `cd flutter-app && flutter test` | 34 unit and widget tests |

CI runs all of the above ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Documentation

- [Architecture and data model](docs/ARCHITECTURE.md)
- [Business flow: from signup to reports](docs/RENTAL_FLOW.md)
- [API reference](docs/API.md)
- [Security model](docs/SECURITY.md)
- [Deployment and operations runbook](docs/DEPLOYMENT.md): start here before the first production deploy, because data migrations must run first
- [Decisions and assumptions](docs/DECISIONS.md)
- [Audit report and resolution status](docs/AUDIT.md)
