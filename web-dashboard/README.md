# Rental Manager Web

React 19 + TypeScript (strict) + Vite + TanStack Query + Tailwind 4.

- Business owners, admins and staff use it to run their shops (dashboard, rentals, customers, equipment, expenses, reports, settings).
- Platform operators use `/platform` to manage businesses and plans.

## Run locally

```bash
cp .env.example .env    # VITE_API_URL=http://localhost:5000/
npm install
npm run dev             # http://localhost:5174
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check and production build (`dist/`) |
| `npm run typecheck` / `npm run lint` | TypeScript and oxlint |
| `npm test` | Unit and component tests (Vitest, Testing Library, MSW) |
| `npm run test:e2e` | Playwright end-to-end tests. Starts the real API on an in-memory database and the dev server automatically; first run `npx playwright install chromium` and `npm install` in `../nodejs-backend`. |

## Structure

```
src/api/http.ts          axios instance: token, X-Shop-Id, error normalisation, 401/shop recovery
src/api/services/        typed API functions per resource (the only place requests are made)
src/lib/queryClient.ts   TanStack Query client; cache keyed by active shop
src/context/             auth, shop, currency, theme
src/components/ui/       UI kit (Button, Input, Modal, Table, QueryState, Img, ImageUpload, ...)
src/components/layout/   shell, sidebar, top bar, notifications, subscription banner
src/pages/               screens (lazy-loaded)
src/utils/               formatting, permissions (mirrors the API's roles), validation, exports
e2e/                     Playwright specs
```

Conventions:
- Server state lives in TanStack Query; invalidate through `hooks/useInvalidate`.
- Business math (return bills, reports) is done by the API; the UI shows the server's numbers.
- Upload images with `<ImageUpload kind="...">`; display them with `<Img>` / `<Avatar>`.
- Brand colours are design tokens in `src/index.css` (`--color-brand-*`).

Deployment: `Dockerfile` builds static files served by nginx (`nginx.conf`); pass `--build-arg VITE_API_URL=https://api.example.com/`.
