# Capacitor mobile builds (Step 3)

## Prerequisites

- Node 20+, npm
- **Android:** Android Studio + JDK 17
- **iOS:** macOS + Xcode (TestFlight)

## Build workflow

```bash
npm install
npm run build:mobile    # vite build + cap sync
```

### Android internal testing

```bash
npx cap open android
```

In Android Studio: **Build → Generate Signed Bundle/APK** → upload to Play Console Internal Testing.

### iOS TestFlight

```bash
npx cap open ios
```

In Xcode: set team, archive, upload to App Store Connect.

## Staging env on device

Set Vercel env or bake into build:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ATHLETYX_API_URL=https://<staging-api>/api/coach
```

Rebuild after changing env: `npm run build:mobile`.

## Native features enabled

| Plugin | Purpose |
|--------|---------|
| `@capacitor/app` | Foreground → cloud sync |
| `@capacitor/network` | Online/offline detection |
| `@capacitor/keyboard` | Chat + workout input |
| `@capacitor/preferences` | Island position, tokens |
| `@capacitor/splash-screen` | Launch screen |
| `@capacitor/status-bar` | Dark status bar |

## Smoke test checklist

- [ ] Sign in → workouts sync from second device
- [ ] Log workout → appears in cloud
- [ ] IronCoach → answer cached on repeat question
- [ ] Settings → export data JSON
- [ ] Settings → request account deletion
- [ ] Dynamic Island drags and persists position
