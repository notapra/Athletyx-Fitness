---
name: Production Launch and Operations
overview: Move IronLog + Athletyx from feature-complete branch state to a stable release path with PR hygiene, staging validation, CI gates, mobile smoke checks, and rollback-ready production runbooks.
todos:
  - id: pr-and-review
    content: Open PR from feature branch to main with release notes and explicit test plan
    status: in_progress
  - id: staging-deploy
    content: Deploy API and frontend to staging with Supabase env wiring and run smoke checks
    status: completed
  - id: ci-gates
    content: Ensure lint, unit, API, and Playwright E2E checks are required before merge
    status: completed
  - id: mobile-validation
    content: Run Capacitor Android/iOS smoke pass for haptics, sync status, auth, and finish-workout flow
    status: in_progress
  - id: release-readiness
    content: Add production rollback and incident checklist in docs and verify monitoring hooks
    status: completed
isProject: false
---

# Stage 04 - Production launch and operations plan

This stage converts the current branch progress into a mergeable, releasable, and supportable production path.

## Scope

- Finalize merge workflow from `feature/ironlog-athletyx-duckduckgo-api` to `main`
- Validate staging environments for frontend, API, and Supabase integration
- Promote CI from advisory to release gate where needed
- Confirm Capacitor mobile behavior on device/emulator
- Ensure rollback and incident-response docs exist before production release

## Workstreams

### 1) PR readiness and merge quality

- Create PR with:
  - High-level release summary
  - Risk notes (offline sync, coach cache, cloud delete path)
  - Test checklist (lint/build/unit/api/e2e + manual mobile smoke)
- Ensure branch is rebased/updated with `main` and conflict free
- Require at least one review before merge

### 2) Staging deployment validation

- API staging target:
  - `athletyx/backend` reachable via health endpoint
  - logging middleware active without noisy failures
- Frontend staging target:
  - app boot with Supabase env values
  - auth + cloud sync path functional
- Supabase:
  - run pending SQL/migrations
  - verify account deletion function and data ownership/RLS behavior

## Validation matrix

| Area | Scenario | Pass criteria |
|------|----------|---------------|
| Auth | Sign in/out + session resume | No redirect loops; expected protected routes |
| Sync | Create/update/delete session online | Local and cloud state converge |
| Offline | Queue mutations then reconnect | Queue drains and status bar clears |
| AI chat | Goal-aware response + fallback | No unhandled API errors |
| Mobile UX | Haptics + rest timer + finish flow | No crashes; expected tactile feedback |

### 3) CI gate hardening

- Required checks on PR:
  - `npm run lint`
  - `npm run build`
  - `npm run test`
  - `npm run test:api`
  - `npm run test:e2e`
- Keep release workflow separate from PR workflow to avoid accidental deploy-on-PR

### 4) Mobile smoke checklist

Run on Android emulator/device and iOS simulator/device:

- Start workout -> add exercise -> finish workout
- Confirm haptic events fire where expected
- Toggle network to test offline queue + sync recovery
- Verify profile/settings edits persist and rehydrate

### 5) Release and operations readiness

- Update production docs with:
  - rollback trigger conditions
  - rollback steps for frontend/API
  - incident capture template (time, impact, mitigation, follow-up)
- Validate monitoring:
  - Sentry event ingestion
  - API request logs include request id/status and do not leak secrets

## Exit criteria

Stage 04 is complete when all of the following are true:

1. PR is approved and mergeable with green required checks.
2. Staging smoke checks pass for web + API + Supabase.
3. Mobile smoke pass is recorded for at least one Android and one iOS target.
4. Release/rollback checklist is documented and verified by a dry run.

## Out of scope

- New product features beyond stabilization and launch readiness
- Large UI redesigns
- Non-critical refactors that increase merge risk
