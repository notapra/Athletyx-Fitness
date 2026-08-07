/**
 * Form Vision panel — accessible opt-in form check during a set.
 * Cue mode (default for a11y) needs no camera; camera is optional preview.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { Camera, Eye, EyeOff, X } from 'lucide-react'
import {
  getFormCuesForExercise,
  getFormVisionPreferences,
  markFormVisionOpened,
  requestCameraStream,
  stopMediaStream,
} from '../../services/formVision.js'

export default function FormVisionPanel({ exerciseName, onClose }) {
  const titleId = useId()
  const descId = useId()
  const liveId = useId()
  const closeRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const cueSet = getFormCuesForExercise(exerciseName)
  const prefs = getFormVisionPreferences()
  const [useCamera, setUseCamera] = useState(Boolean(prefs.preferCamera))
  const [cueIndex, setCueIndex] = useState(0)
  const [cameraError, setCameraError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)

  const activeCue = cueSet.cues[cueIndex] ?? cueSet.cues[0]

  useEffect(() => {
    markFormVisionOpened()
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
      if (e.key === 'ArrowRight') {
        setCueIndex((i) => (i + 1) % cueSet.cues.length)
      }
      if (e.key === 'ArrowLeft') {
        setCueIndex((i) => (i - 1 + cueSet.cues.length) % cueSet.cues.length)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cueSet.cues.length, onClose])

  useEffect(() => {
    let cancelled = false

    async function start() {
      stopMediaStream(streamRef.current)
      streamRef.current = null
      setCameraReady(false)
      setCameraError('')
      if (!useCamera) return
      try {
        const stream = await requestCameraStream()
        if (cancelled) {
          stopMediaStream(stream)
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
          setCameraReady(true)
        }
      } catch (err) {
        setCameraError(err?.message || 'Could not open camera.')
        setUseCamera(false)
      }
    }

    start()
    return () => {
      cancelled = true
      stopMediaStream(streamRef.current)
      streamRef.current = null
    }
  }, [useCamera])

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        data-testid="form-vision-panel"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-cyan-500/30 bg-zinc-950 p-4 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-white">
              Form check — {cueSet.title}
            </h2>
            <p id={descId} className="mt-1 text-xs text-zinc-500">
              Opt-in coaching. Camera is optional. Cues are announced for screen readers.
              Not medical advice — stop if you feel sharp pain.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            data-testid="form-vision-close"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 p-2 text-zinc-300"
            aria-label="Close form check"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="form-vision-cue-mode"
            onClick={() => setUseCamera(false)}
            className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs ${
              !useCamera
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                : 'border-zinc-700 text-zinc-400'
            }`}
            aria-pressed={!useCamera}
          >
            <EyeOff className="h-3.5 w-3.5" />
            Cue only
          </button>
          <button
            type="button"
            data-testid="form-vision-camera-mode"
            onClick={() => setUseCamera(true)}
            className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs ${
              useCamera
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                : 'border-zinc-700 text-zinc-400'
            }`}
            aria-pressed={useCamera}
          >
            <Camera className="h-3.5 w-3.5" />
            Camera preview
          </button>
        </div>

        {useCamera ? (
          <div className="mb-3 overflow-hidden rounded-2xl border border-zinc-800 bg-black">
            <video
              ref={videoRef}
              className="aspect-video w-full object-cover"
              playsInline
              muted
              aria-label="Live camera preview for form self-check"
            />
            {!cameraReady && !cameraError ? (
              <p className="p-3 text-center text-xs text-zinc-500">Starting camera…</p>
            ) : null}
          </div>
        ) : (
          <div
            className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-xs text-zinc-400"
            data-testid="form-vision-cue-only"
          >
            <Eye className="mb-2 h-4 w-4 text-cyan-400" aria-hidden />
            Cue-only mode — no camera. Use arrow keys or Next cue to cycle tips.
          </div>
        )}

        {cameraError ? (
          <p className="mb-3 text-xs text-amber-400" role="alert">
            {cameraError} Switched to cue-only mode.
          </p>
        ) : null}

        <div
          id={liveId}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="form-vision-cue"
          className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-zinc-100"
        >
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-400">
            Cue {cueIndex + 1} of {cueSet.cues.length}
          </p>
          <p>{activeCue}</p>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            data-testid="form-vision-prev-cue"
            onClick={() =>
              setCueIndex((i) => (i - 1 + cueSet.cues.length) % cueSet.cues.length)
            }
            className="flex-1 rounded-2xl border border-zinc-700 py-2.5 text-xs font-semibold text-zinc-300"
          >
            Previous cue
          </button>
          <button
            type="button"
            data-testid="form-vision-next-cue"
            onClick={() => setCueIndex((i) => (i + 1) % cueSet.cues.length)}
            className="flex-1 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 py-2.5 text-xs font-semibold text-cyan-200"
          >
            Next cue
          </button>
        </div>

        <p className="mt-3 text-[10px] text-zinc-600">
          Pose detection ML can plug into this panel later. Today: accessible cues + optional
          camera mirror.
        </p>
      </div>
    </div>
  )
}
