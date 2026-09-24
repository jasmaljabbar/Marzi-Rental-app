# Migration status and test results

Analysis and implementation date: 2026-09-14. The active Flutter application is implemented and builds successfully. Source/fixture tests pass; authenticated test-account and physical-device parity certification remains pending.

| Work | Status / evidence |
|---|---|
| Existing project preserved | PASS: 99 source/config/asset hashes unchanged; no tracked diffs in original app/backend/dashboard; `../test-results/preservation.json` |
| Source inventory | 99 source/config/asset files; 86 TypeScript modules; 20 screen files, 19 registered |
| Architecture, navigation, APIs/storage, forms/design, implementation plan | Complete initial documents; implementation follows the isolated sibling-app plan |
| Human semantic review | Core startup/auth/services/storage/reservation/return paths reviewed; per-screen AST evidence extracted; runtime states and exhaustive backend controller behavior still need testing |
| Reference characterization | 15/15 PASS; `../test-results/baseline.json` |
| Original TypeScript baseline | FAIL: 10 existing errors, `../test-results/react-native-typecheck.txt`; app unchanged |
| Reference app device/UI run | NOT RUN |
| Authenticated API/mutation integration | NOT RUN; no test account supplied and no production data changed |
| Flutter SDK health and device toolchain | PASS: Flutter 3.44.9/Dart 3.12.2; Android 36, Chrome and Linux toolchains reported healthy |
| Flutter active-screen implementation | IMPLEMENTED: 19 registered destinations, seven tabs, API/storage/platform adapters |
| Flutter static analysis | PASS: no issues |
| Flutter unit/widget tests | PASS: 12/12 |
| Flutter device tests | NOT RUN: no Android/iOS device connected; Android and web builds succeeded |
| Visual parity screenshots/goldens | NOT CAPTURED |
| Installable build / final deliverable | PASS: 57.0MB release-mode APK and web bundle built |

## Tests actually executed

The characterization harness loads and transpiles the original TypeScript functions, freezes time at 2026-09-14T06:30:00Z, and uses fake fetch/storage for HTTP. Passed: minimum one day; exactly 24h; 24h+1ms; future date clamp; invalid date dash; damage subtraction clamp; missing stock; current-rate gross; weighted return allocation; overpayment pending floor; missing equipment rate; Bearer+JSON; empty success; structured 409; non-JSON 503. These checks establish reference expectations, not Flutter parity.

Flutter tests pass 12 checks: eight calculation/HTTP parity tests, one image-upload MIME contract test, plus signup validation, authenticated seven-tab shell, and Home customer story-strip tests. The upload test proves picked JPEG bytes use `image/jpeg` in multipart data, satisfying the backend's `image/*` filter. The Home regression test verifies customer rendering, existing selection-state reuse, detail updates, horizontal scrolling and narrow-screen overflow safety. The return allocation test reads the executed React Native fixture and compares gross, advance, discount, payment, revenue and pending values line by line. API tests cover null/zero/false preservation, query omission, bearer headers, reservation 409 payloads, pagination headers, return payload omission and non-JSON failures.

Build verification: `flutter analyze` reports no issues; debug and release-mode APK builds succeeded; the release-mode APK is 57,085,433 bytes with SHA-256 `e693a2160f4b9b3181ae1ba7897efcaee035b2214ea7885c62e034ab5ec05b29`; `flutter build web` succeeded including its WebAssembly dry-run. The release build is currently signed with the generated debug key for local installation, not store distribution. A localhost browser smoke test visibly reached the expected Startup failed state when the configured production API fetch was unavailable from localhost. This proves the built UI runs and the failure state renders, but not authenticated feature parity.

Typecheck issues: category numeric/string ID; obsolete customer aadhar_number references (3); equipment mapping missing useful_life_years and numeric/string comparison; rental repository string/number mismatches (3); invalid icon name in unregistered AddRentalScreen. No attempt made to fix source application.

## Required end-to-end parity scenarios

| ID | Scenario | Expected evidence | Status |
|---|---|---|---|
| AUTH-01 | Cold start health succeeds/fails; delayed hydration/intro | Both apps timing and visible state | Flutter failure state smoke-tested; two-app timing comparison pending |
| AUTH-02 | Login invalid/valid, restart, logout, owner/admin/staff | Request trace/session keys/navigation | Pending |
| AUTH-03 | Signup and reset including demo-code response | Validation copy and payload comparison | Pending |
| CUST-01 | Search/add/edit/delete; missing and duplicate fields; related-record rejection | Requests, screen states, server errors | Pending |
| MEDIA-01 | Photo/document/gallery/retake/denial/cancel, upload error | Native device recording, stored URLs | Multipart MIME contract PASS; native device flow pending |
| INV-01 | Category and equipment CRUD; stock, damage, repair, scrap | Stock and expense deltas | Pending |
| SALE-01 | Sale, partial/full payment, staff rejection | Sale/customer balances and response | Pending |
| RES-01 | Switch customer drafts, cross-device conflict, transfer, notices | Poll/request sequence and retained selections | Pending |
| RENT-01 | Both creation paths, quantity/date/advance edge cases | Exact payload, hold cleanup, route result | Pending |
| RET-01 | All return entry points, caps, late fee, tax, due reminder | Backend totals, QR gate, invoice route | Pending |
| RET-02 | Batch weighting, subset, second request fails | Reference fixture match; partial success | Allocation fixture PASS; live partial-failure scenario pending |
| RET-03 | Return succeeds then damage reporting fails | Warning and completed rental retained | Pending |
| PDF-01 | Invoice list/detail + share/print/download/cancel/cache | Exact PDF bytes and device results | Pending |
| EXP-01 | Expense CRUD/search/category/payment/receipt | Payload and totals | Pending |
| RPT-01 | Day/month/year, date boundaries, daily report | Totals and rendered PDF comparison | Pending |
| PLAN-01 | Missing account/404, disabled features, exhausted limits | Same visibility and server error behavior | Pending |
| LOCAL-01 | Theme/settings persistence native versus web | Restart/reload key comparison | Pending |
| BACKUP-01 | Legacy schema/version/files/import failure/retry | Staged count/file verification, original intact | Pending |
| NAV-01 | All tab/root/modal/back/deep arguments and bell links | Route trace comparison | Seven-tab shell widget test PASS; full route trace pending |
| UI-01 | Every registered screen and modal in both themes | Matched-device baseline diff review | Pending |

All active feature areas have a Flutter implementation. Remaining rows require a separate test API/account and physical Android/iOS devices to certify live side effects, permissions, PDFs and visual parity. They are not presented as passing results.
