---
name: Ship and Operate
overview: Close the release path — green CI, mergeable PR, documented ops, and operator-ready staging checklist.
todos:
  - id: ci-green
    content: All required checks pass on PR (frontend, backend, e2e)
    status: completed
  - id: pr-open
    content: PR to main with Stage 04 test plan and branch protection
    status: completed
  - id: ops-docs
    content: Production deploy, rollback, incident, and smoke runbooks
    status: completed
  - id: nutrition-efficiency
    content: Built-in per-100g catalog — zero API calls for common foods
    status: completed
  - id: cloud-staging
    content: Live Supabase + Railway + Vercel staging (operator login)
    status: pending
  - id: merge-main
    content: Merge via Stage 09 release PR (supersedes PR #1)
    status: pending
isProject: false
---

# Stage 07 — Ship and operate

## Efficiency confirmation

| Area | Result |
|------|--------|
| **CI** | 3 parallel jobs; backend includes pytest + live uvicorn smoke |
| **Nutrition** | 35 built-in foods, offline search, gram-linear scaling, no API for staples |
| **API routing** | Centralized URL resolver — dev proxy + production coach-base fixed |
| **Tests** | 29+ pytest, nutrition math, API URLs, common foods, 8 e2e flows |
| **Ops** | Rollback triggers, incident template, staging runbooks, branch protection |

**Operator-blocked (not code):** Supabase/Railway/Vercel login, device emulator disk, PR merge click.

## Exit criteria

1. PR #1 merged to `main` with green checks
2. Staging smoke on real cloud URLs
3. Mobile device pass recorded

## Out of scope

New product features — see Stage 08.
