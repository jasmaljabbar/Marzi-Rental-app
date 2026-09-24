# Flutter architecture and implementation sequence

This was the implementation contract documented before coding. The active screen set is now implemented. Behavioral and visual certification still follows the acceptance gates below; implemented does not mean every live-device parity row has passed.

## Isolation

The sibling `flutter-app/` has been created; all original folders remain untouched. It uses the separate Android application ID `com.rentalmanager.migration.rental_manager` and copied assets. Migration tooling/docs remain in `migration/`. The implementation does not overwrite installed React Native data or migrate the production database.

## Architecture

```text
flutter-app/lib/
  app/                 startup, dependency composition, typed navigation
  core/
    network/           HTTP client, ApiError, query encoding, pagination
    storage/           session, settings, legacy backup/file adapters
    theme/             original tokens and explicit legacy style overrides
    widgets/           buttons, inputs, sheets, toast layers, image viewer
    platform/          camera/gallery, print/share/save, external links
  features/<feature>/
    domain/            entities, repository contracts, calculation policies
    data/              DTO mapping and repository implementations
    presentation/      screen, controller/state, feature widgets
```

Views depend on controllers/use cases and repository interfaces; cloud/local implementations stay in data layers. Use immutable typed models preserving string IDs, nullable fields, missing versus explicit null requests, date semantics and decimal rounding. Inject clock, HTTP, storage and platform adapters so tests are deterministic. Keep an in-memory query cache with explicit invalidations and polling lifetimes equivalent to React Query. Choose Flutter packages only after SDK/platform verification; this document does not assert package versions or platform support.

Use shared return calculations but separate entry-point presentation policies. Do not abstract all form screens into one generic form renderer. Treat historical backup schema as a versioned boundary rather than current domain schema.

## Feature order and acceptance gates

| Phase | Scope | Required proof before marked complete |
|---|---|---|
| 0 | Source docs, baseline evidence, runtime reference capture | Source manifest, route/form/API inventory, known discrepancies, device screenshots and seeded account fixtures |
| 1 | Flutter bootstrap/theme/transport/session/login/signup/reset/navigation | Health failure, saved session, logout, validation/error request traces; auth screenshots; app launch |
| 2 | Shared forms/media, categories/customers | Create/edit/delete failure, image/camera cancellation; list/detail states and exact field payloads |
| 3 | Inventory/equipment/stock/damage/repair/scrap/sales | Stock/expense side effects, roles and plan failures, sale payments; screen comparison |
| 4 | Home reservations + rental creation | Two customers/devices conflict/transfer/notice/ack, poll timing, quantity rejection/revert, clear, post-create route |
| 5 | Rentals/details/customer history/returns/payments | Original oracle matches, date boundaries, all three return entry points, partial batch failure, QR gates and invoices |
| 6 | Invoice list/detail/PDF | Header/status filters, branded content, unchanged server bytes, all save/share/print platforms |
| 7 | Expenses/dashboard/reports | Search/filter totals and range parity, net-profit contract, daily PDF content/layout |
| 8 | More/account/company/settings/legacy storage compatibility | Theme restart, legacy 404, plan defaults, local cap, safe copy/backup fixture import and rollback |
| 9 | Full regression and delivery | All registered screens and modals, navigation/back, feature/role matrices; Android/iOS builds, device test reports and remaining deviations |

Each feature begins by reading its source evidence, recording fixture inputs/expected requests and screenshots, implementing domain/data/UI, running unit and widget checks, then comparing both apps with identical fixture state. Cross-framework golden comparison needs matched resolution, density, locale, text scale, theme and clock. Golden tests generated only from Flutter are not evidence of React Native parity.

## Data migration and rollback

Development is additive and does not share native app storage. Later upgrade migration: export/copy original SQLite and files read-only; inspect version and row counts; import into staging transaction; map file references; verify counts and bytes; retain original copy. Bridge AsyncStorage intentionally rather than assuming shared_preferences can read it. Mark successful migration only after verification; retries must not duplicate imported rows. Cloud remains shared authority and backup restore must never silently upload legacy data. No destructive contraction/removal is planned.
