# React Native → Flutter migration

Status: Flutter implementation and build milestone complete. All active screen destinations are implemented in the isolated `flutter-app/`, static analysis is clean, 12 automated Flutter checks pass, and Android/web artifacts build successfully. Authenticated test-account flows, physical-device permissions, and two-app visual parity remain unverified. The existing application is unchanged.

The executable React Native source is authoritative. Both repository READMEs contain outdated deployment/storage descriptions: current mobile business operations use the Node.js HTTP API, not local repositories.

## Review documents

- [Current architecture and findings](docs/01-analysis.md)
- [Screen and feature catalogue](docs/02-screens.md)
- [Navigation map](docs/03-navigation.md)
- [API and storage contracts](docs/04-contracts.md)
- [Forms, calculations, and design parity](docs/05-parity.md)
- [Flutter architecture and migration sequence](docs/06-implementation-plan.md)
- [Migration status and test results](docs/07-status-and-tests.md)
- [Exact API call sites](docs/evidence/api-call-sites.md)
- [Source inventory](docs/evidence/source-inventory.json): imports, API/state/query calls, controls, conditions, visible text, and styles, with line numbers.
- [Source SHA-256 manifest](docs/evidence/source-manifest.json): 99 source/config/asset files at analysis time.

Every screen and component has an individual evidence document under `docs/evidence/`. These are mechanically extracted source references, not proof of runtime behavior or complete semantic review.

## Reproduce analysis

From the repository root, using the existing mobile TypeScript dependency:

```sh
node migration/tools/analyze-source.cjs
node migration/tools/baseline.cjs
node mobile-app/node_modules/typescript/bin/tsc --project mobile-app/tsconfig.json --noEmit
```

The tools write only inside `migration/`. Characterization runs original pure TypeScript and HTTP code with an isolated clock, storage fake, and fetch fake. No production requests or mutations occur.

## Flutter deliverables

- Source and run instructions: [`../flutter-app/README.md`](../flutter-app/README.md)
- Release-mode APK: [`../flutter-app/build/app/outputs/flutter-apk/app-release.apk`](../flutter-app/build/app/outputs/flutter-apk/app-release.apk)
- Web bundle: `../flutter-app/build/web/`
- Verification record: [`test-results/flutter-verification.md`](test-results/flutter-verification.md)
