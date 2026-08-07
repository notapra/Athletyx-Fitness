---
name: Form Vision Opt-in
overview: Make computer-vision form coaching an accessible opt-in option — Settings toggle, workout Form check, cue-only mode without camera, optional camera preview.
todos:
  - id: form-vision-service
    content: Prefs + cue library + camera helpers
    status: completed
  - id: form-vision-ui
    content: Accessible FormVisionPanel + ActiveWorkout Form button
    status: completed
  - id: settings-opt-in
    content: Settings Form Vision card (enable + prefer camera)
    status: completed
  - id: pose-ml-later
    content: Optional MediaPipe / pose model plug-in (future)
    status: pending
isProject: false
---

# Stage 10 — Form Vision (opt-in)

## What shipped

- **Settings → Form Vision** — enable in workouts; prefer camera (optional)
- **Active workout → Form** — opens accessible dialog with text cues (`aria-live`)
- **Cue-only mode** — no camera required (a11y default path)
- **Camera preview** — optional self-check mirror via `getUserMedia`
- Cue packs: bench, T-bar/landmine row, squat, deadlift, OHP, generic

## Not yet

Pose landmark ML (MediaPipe etc.) — panel is ready to host it later.
