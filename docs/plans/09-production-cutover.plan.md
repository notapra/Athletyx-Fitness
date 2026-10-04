---
name: Production Cutover
overview: Consolidate Stage 08 into a release PR against main, harden production defaults, and document the merge/deploy checklist.
todos:
  - id: release-branch
    content: Create release/stage-09-production from stage-08 tip; open PR to main; supersede PR #1
    status: completed
  - id: prod-defaults
    content: Harden prod env docs/defaults — REQUIRE_AUTH, optional OpenAI, API URL, health store notes
    status: completed
  - id: cutover-docs
    content: Stage 09 cutover checklist in production-deploy.md; plans 08 complete / 09 active
    status: completed
  - id: verify-ci
    content: Local lint/test/build/accuracy/smoke; PR CI jobs green
    status: completed
isProject: false
---

# Stage 09 — Production cutover

## Scope

- Release branch from Stage 08 tip (health sync + evidence RAG coach)
- New PR → `main` (supersedes PR #1)
- Production defaults: `REQUIRE_AUTH=true` on staging/prod, OpenAI optional
- Cutover checklist for operator cloud promote

## Exit criteria

1. PR open against `main` from `release/stage-09-production`
2. Plans README shows 08 completed, 09 in progress/completed
3. Cutover checklist documented; local + CI green
4. Ready for merge click + cloud promote
