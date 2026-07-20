# Mobile smoke record (Stage 04)

Copy a row per device pass. Keep this file updated before store submission.

## Android

| Field | Value |
|-------|-------|
| Date | |
| Device / emulator | |
| Build | `npm run build:mobile` + Android Studio |
| App version / commit | |

Checklist:

- [ ] Cold start → AuthGate requires sign-in when Supabase configured
- [ ] Sign in / sign out / switch account
- [ ] Start workout → add exercise → finish → summary
- [ ] Haptics on set log / rest complete / finish (device only)
- [ ] Nutrition → log grams → totals update
- [ ] Airplane mode → queue banner → reconnect syncs
- [ ] Profile / settings persist after kill & relaunch
- [ ] Sync status bar clears when online and queue empty

**Result:** PASS / FAIL  
**Notes:**

## iOS

| Field | Value |
|-------|-------|
| Date | |
| Device / simulator | |
| Build | `npm run build:mobile` + Xcode |
| App version / commit | |

Checklist: same as Android.

**Result:** PASS / FAIL  
**Notes:**

## Desktop dry-run (CI / local web)

Use when emulator is unavailable; does not replace device pass.

| Date | Commit | Commands | Result |
|------|--------|----------|--------|
| 2026-07-19 | Stage 04 ops (pre-PR) | `npm run lint && npm run build && npm run test` | PASS (lint clean, build ok, 17 pytest + nutrition math) |
| | | `npm run test:e2e` | Run on CI (`e2e` job) after push |
| | | Device Android/iOS | Pending operator pass on emulator/device |
