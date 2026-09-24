# Current application analysis

## Scope and evidence

Inspected app bootstrap, both navigators, auth/theme stores, complete service facade and HTTP wrapper, schemas and storage, forms, reservation and return logic, reports/PDF paths, query/mutation call sites, and backend route contracts. Generated AST evidence for all 86 TypeScript modules, including all 20 screen files. Human review concentrates on behavior-bearing code; every rendered state still requires runtime inspection. Source analysis must not be interpreted as pixel or device parity verification.

The workspace also contains `nodejs-backend` and `web-dashboard`. Backend routes are supporting evidence for errors/permissions; web-only features do not expand mobile migration scope. No existing tracked files were changed. Flutter and Dart executables are present on PATH; SDK health, platform toolchains, and supported devices have not yet been verified.

## Runtime architecture

`App.tsx` creates a shared React Query client, gesture root, safe-area provider, and Toast provider. Startup initializes SQLite, calls `authApi.bootstrap()` (`GET /health`), sets local `auth_mode=cloud`, and then hydrates auth and theme concurrently. Until ready, show a white spinner screen. Startup failure displays “Startup failed” and the exception message with no retry action. After auth hydration, show `assets/NBlogo.png` centered at 240×240 for 1,800ms. Then mount navigation.

Token presence chooses logged-out Login/Signup versus authenticated tabs and stack. Hydration does not validate expiration or refresh credentials. All normal business APIs call the configured cloud host. There is no functioning offline mutation queue: `sync/service.ts` functions are no-ops. React Query cache is in memory. Local SQLite repositories are retained code, not the active CRUD facade.

## Important compatibility findings

| Finding | Source | Migration consequence |
|---|---|---|
| Offline README contradicts live HTTP services | `mobile-app/README.md`, `src/api/services.ts` | Reproduce cloud behavior; do not build an offline business database as the main backend |
| Startup requires health even with a saved token | `App.tsx` | Offline cold launch currently fails; record and test explicitly |
| Home drafts are server reservations; Rentals bundles are local component state | `HomeScreen.tsx`, `RentalsScreen.tsx` | Separate state lifetimes and conflict behavior |
| Only 19 of 20 screen files are registered | `RootNavigator.tsx`, `MainTabs.tsx` | `AddRentalScreen` is unregistered; do not create a new route to it |
| Local QR key is read but no current screen writes it | `settingsApi`, return screens | Preserve legacy value and empty QR state; do not invent QR settings UI |
| Backup and user-management facade methods have no screen callers | `services.ts`, source call search | Retain compatibility scope separately from visible navigation |
| Web SQLite is intentionally `:memory:` and old snapshot key is removed on open | `db/database.ts` | Web preference persistence differs from native; document platform differences |
| Return logic differs across customer, rental, and equipment entry points | respective screens | Avoid a single normalized form that silently changes behavior |
| Many lists and detail lookups use only first 200 rows | query call sites | Test missing detail/fallback names and pagination limits |
| UI discount cap is device-local; backend also reads a server setting | More, BatchReturn, `rentalController.js` | The two caps need not agree; server response remains authoritative |
| Client rental estimate uses inclusive calendar days; backend estimate uses elapsed-day ceiling | RentalForm, backend rental controller | Submission can be rejected despite client allowance; preserve server errors |
| `syncApi.status` returns a promise without awaiting inside try/catch | `services.ts` | Async rejection can escape the intended offline fallback |
| Some screens/forms use static light colors | Login, Signup, Rentals, CustomerDetail, shared forms | Do not silently redesign dark mode; capture mixed-theme baseline |
| Equipment-detail return does not navigate to Invoice like customer/rental return | `EquipmentDetailScreen.tsx` | Keep separate post-return navigation policies |

## Remaining analysis evidence

Need baseline screenshots in light/dark/system modes, phone and tablet widths, keyboard/modal/back handling, actual native permissions and file pickers, and an isolated test account with seeded data for multi-user reservation conflicts and backend mutation results. These have not been exercised against a running app. API schema/type declarations and backend source cannot prove the currently deployed server has the same revision.
