---
name: Health Platform Integration
overview: Wire Apple HealthKit and Google Health Connect for workout import/export, with Settings UI and MCP tool alignment.
todos:
  - id: health-service
    content: Platform-aware healthSync service with prefs and status API
    status: completed
  - id: settings-ui
    content: Settings health sync card with enable toggle and platform messaging
    status: completed
  - id: native-ios
    content: Capacitor HealthKit plugin — import/export workouts
    status: completed
  - id: native-android
    content: Health Connect plugin — import/export workouts
    status: completed
  - id: mcp-live-status
    content: MCP get_healthkit_status reflects plugin integration status
    status: completed
isProject: false
---

# Stage 08 — Health platform integration

## Scope

- **iOS:** Apple HealthKit workout samples (read + write finished sessions)
- **Android:** Google Health Connect equivalent
- **App:** Settings toggle, import on app foreground, export on workout finish
- **MCP:** `sync_healthkit_workouts` / `get_healthkit_status` return live state

## Architecture

```mermaid
flowchart LR
  subgraph native [Native]
    HK[HealthKit / Health Connect]
  end
  subgraph app [IronLog]
    HS[healthSync.js]
    SS[syncService.js]
    Set[Settings UI]
  end
  subgraph mcp [MCP]
    T[healthkit tools]
  end
  HK <--> HS
  HS --> SS
  Set --> HS
  T --> HS
```

## Verification

- Settings shows correct platform (`ios` / `android` / `web`)
- Toggle persists in `localStorage`
- MCP tools return `available: true` after native plugin ships
