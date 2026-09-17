---
name: Live Vision Coach Feedback
overview: Future production stage — turn raw Gemini motion detection into coach-like live feedback during workouts (cues, corrections, encouragement) without changing today’s raw-analysis MVP.
todos:
  - id: coach-feedback-ux
    content: Design coach-style overlay (rep phase, cue stack, spoken/aria coaching) on top of raw detection
    status: pending
  - id: temporal-model
    content: Multi-frame / short-clip context for rep counting and phase (eccentric/concentric)
    status: pending
  - id: safety-rails
    content: Injury-aware wording, stop-if-pain, confidence gates before assertive coaching
    status: pending
  - id: offline-pose
    content: Optional on-device MediaPipe gate before Gemini (lower cost, faster presence detect)
    status: pending
isProject: false
---

# Stage 11 — Live Vision coach-style feedback (future)

## Status

**Backlog / future production stage.** Not implementing in the current MVP.

## What ships today (MVP — do not regress)

- Workout Scan FAB opens Live Vision
- Cloud consent **auto-enabled** for Live Vision
- Gemini **assumes** the movement from camera frames
- UI shows **assumed workout** + **raw analysis** fields (`detected_exercise`, `confidence`, `matches_logged`, `form_score`, `faults`, `cues`, `summary`)

## Goal (later)

Make Live Vision feel like a **real coach on the floor**: continuous, glanceable feedback on the exact lift the athlete is doing — not just a raw JSON dump.

## Proposed capabilities

1. **Coach cue layer** — prioritize 1 spoken/aria cue at a time from `faults`/`cues`, with urgency (safety > form > encouragement)
2. **Temporal awareness** — track set phases across frames; count reps when confident
3. **Exercise lock** — after stable detection, lock the lift and coach that pattern unless mismatch is strong
4. **Session notes** — optional post-set summary (“saw 6 reps; hips rising early on last 2”)
5. **On-device assist** — MediaPipe person/pose presence before calling Gemini (cost + latency)

## Out of scope until Stage 11 starts

- Skeleton overlays
- Auto-renaming every set without confirmation
- Medical diagnosis language

## Depends on

- Stable `/api/form-vision` + Gemini key on staging HTTPS (phone gym testing)
- Mobile capture / motion-gate optimizations already on `LIVE_VISION`
