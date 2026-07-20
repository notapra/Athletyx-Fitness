# Mobile smoke record (Stage 04)

Copy a row per device pass. Keep this file updated before store submission.

## Android

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Device / emulator | AVD `Medium_Phone_API_36.0` — start blocked (insufficient disk space) |
| Build | `npm run build:mobile` + `gradlew assembleDebug` (JDK 21) → `android/app/build/outputs/apk/debug/app-debug.apk` |
| App version / commit | `dynamic-api-collection-and-macro` / Stage 04 |

Checklist:

- [x] `npm run build:mobile` — web assets synced to `android/` + `ios/`
- [x] `assembleDebug` APK produced (~6.3 MB)
- [ ] Cold start → AuthGate requires sign-in when Supabase configured
- [ ] Sign in / sign out / switch account
- [ ] Start workout → add exercise → finish → summary
- [ ] Haptics on set log / rest complete / finish (device only)
- [ ] Nutrition → log grams → totals update
- [ ] Airplane mode → queue banner → reconnect syncs
- [ ] Profile / settings persist after kill & relaunch
- [ ] Sync status bar clears when online and queue empty

**Result:** PARTIAL — Capacitor sync + debug APK PASS; on-device UI pending free disk / physical device  
**Notes:** Use JDK 21 (`JAVA_HOME`). Emulator FATAL: not enough disk space for AVD.

## iOS

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Device / simulator | N/A on Windows host — `cap sync` updated `ios/` project |
| Build | `npm run build:mobile` + Xcode (macOS) |
| App version / commit | `dynamic-api-collection-and-macro` / Stage 04 |

Checklist: same as Android (run on macOS).

**Result:** PARTIAL — iOS project synced; simulator/device pass requires macOS + Xcode  
**Notes:**

## Desktop dry-run (CI / local web)

Use when emulator is unavailable; does not replace device pass.

| Date | Commit | Commands | Result |
|------|--------|----------|--------|
| 2026-07-19 | Stage 04 ops | `npm run lint && npm run build && npm run test` | PASS (lint clean, build ok, 17 pytest + nutrition math) |
| 2026-07-19 | PR #1 CI | `frontend` / `backend` / `e2e` | PASS (required on `main`) |
| 2026-07-19 | Local API | `npm run test:staging -- http://127.0.0.1:8000` | PASS 3/3 |
| 2026-07-19 | Capacitor | `npm run build:mobile` | PASS (android + ios sync) |
| | | Device Android/iOS UI | Pending operator on emulator/device |

## Rollback / incident dry-run

| Date | Exercise | Result |
|------|----------|--------|
| 2026-07-19 | Walked [`production-deploy.md`](production-deploy.md) rollback triggers + Vercel/Railway/DB steps; confirmed [`incident-template.md`](incident-template.md) fields cover Sev-1/2 | PASS (doc dry-run; no live rollback) |
