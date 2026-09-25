# RentalManager Flutter

Mobile app for Rental Manager (Android, iOS, web). It replaces the earlier React Native app and follows the same rules as the web dashboard: per-shop data (`X-Shop-Id`), role-based tools, server-computed returns and reports, and email-link password resets. The session token is stored in the OS keystore.

## Implemented scope

The app includes startup health checking and splash behavior, persisted login/signup/password reset, seven-tab navigation, theme selection, customers and documents/photos, a responsive customer story strip on Home that reuses the existing customer-selection flow, equipment/categories/stock, damage/repair/scrap/sales, server-backed reservation drafts and conflicts, both rental-creation paths, rental editing, individual and proportional batch returns, payments and due reminders, invoices and server PDF actions, expenses and receipt uploads, dashboard, reports and daily report PDF, account-plan feature gates, and company/invoice settings.

The default API is the hosted one, `https://marzi-api.vercel.app/`. Override it without editing source:

```sh
flutter run --dart-define=API_URL=https://your-test-api.example.com
```

Optional support actions use `SUPPORT_PHONE` and `SUPPORT_EMAIL` Dart defines.

## Run against a local API

Start the API first (`cd ../nodejs-backend && npm run dev:local`), wait for `API listening`, then pick the command for your target:

| Target | Command |
|---|---|
| Chrome (Flutter web) | `flutter run -d chrome --dart-define=API_URL=http://localhost:5000/` |
| Android emulator | `flutter run --dart-define=API_URL=http://10.0.2.2:5000/` (`10.0.2.2` is the emulator's address for your computer) |
| Physical phone on the same Wi-Fi | `flutter run --dart-define=API_URL=http://<your computer's LAN IP>:5000/` |
| iOS simulator | `flutter run --dart-define=API_URL=http://localhost:5000/` |

"Startup failed … Failed to fetch, uri=…/health" means the app could not reach the API: it is not running, the address is wrong for the target, or (web only) the browser blocked the request. Outside production the API accepts browser requests from any `http://localhost:<port>`, because `flutter run -d chrome` picks a new port each time. A production API only accepts the origins listed in `CORS_ORIGINS`.

## Run and verify

```sh
flutter pub get
flutter analyze
flutter test
flutter run
```

Build Android and web artifacts:

```sh
flutter build apk --release
flutter build web
```

Camera and gallery permissions are declared for Android/iOS. Android invoice Download opens a directory picker and writes the server PDF into the selected folder. iOS uses its share sheet/Save to Files behavior. Invoice PDF downloads are cached natively by sanitized invoice number, matching the original app's cache policy.

## Rules shared with the web app

- Staff don't see owner/admin tools (catalog edits, sell/scrap, reports, plan, rental rules, company settings, team).
- Owners with several shops pick the working shop in More → Account; every request carries it.
- Returns are priced by the API (`/rentals/return/preview`) and saved in one transaction (`/rentals/return`), including damage charges and advance refunds.
- Sign-in asks for the business code only when the username is used by more than one business.

## Architecture

`lib/core` owns immutable wire records, calculations, HTTP semantics, device storage, theming, shared widgets and platform adapters. `lib/features` owns feature screens/forms. `lib/app` composes state and navigation. HTTP, storage and clock-sensitive calculations are isolated enough to test against captured React Native fixtures.

Full source analysis, endpoint contracts, migration decisions, test status and remaining live-device checks are in [the migration documents](../migration/README.md).
