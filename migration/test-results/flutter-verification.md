# Flutter verification — 2026-09-14

## Passed

- `flutter analyze`: no issues.
- `flutter test --reporter expanded`: 12/12 tests passed.
- `flutter build apk --debug`: passed.
- `flutter build apk --release`: passed; 57,085,433 bytes.
- `flutter build web`: passed; WebAssembly compatibility dry-run also succeeded.
- Browser smoke test: generated web bundle loaded and visibly rendered the Startup failed state when localhost could not fetch the configured API.
- Original-source preservation: no tracked diff under `mobile-app`, `nodejs-backend`, `web-dashboard`, or the repository README.

## Automated parity coverage

Eight source-fixture tests cover elapsed-day boundaries, damaged-stock clamping, proportional batch-return allocation against executed React Native output, JSON null/zero/false preservation, query omission rules, Bearer headers, reservation conflict bodies, pagination, return payload omission and non-JSON HTTP failures. One upload protocol test verifies multipart images carry an `image/*` MIME type accepted by the backend. Three widget tests cover the exact signup validation rule, the authenticated seven-tab shell, and the Home customer story strip's selection and narrow-screen scrolling behavior.

## Artifacts

- Release-mode APK: `flutter-app/build/app/outputs/flutter-apk/app-release.apk`
- Debug APK: `flutter-app/build/app/outputs/flutter-apk/app-debug.apk`
- Web output: `flutter-app/build/web/`
- Release APK SHA-256: `e693a2160f4b9b3181ae1ba7897efcaee035b2214ea7885c62e034ab5ec05b29`

## Not certified in this environment

No test API/account or Android/iOS device was available. Live authenticated CRUD, multi-user reservation conflicts, camera/gallery permissions, directory-picker PDF save, printing, and pixel comparison with the React Native app remain pending. The default production API was not mutated. The release-mode APK uses the generated debug signing key and must be signed with the owner's release key before store distribution.
