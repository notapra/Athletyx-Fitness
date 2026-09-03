/**
 * Form Vision panel — accessible opt-in form check during a set.
 * Cue mode (default for a11y) needs no camera; Camera is preview;
 * Live Vision samples frames and uses Gemini via Athletyx (mobile-optimized).
 */

import { useEffect, useId, useRef, useState } from 'react'
import { Camera, Eye, EyeOff, Loader2, Radio, X } from 'lucide-react'
import {
  captureVideoFrames,
  createMotionGate,
  formatRelativeAge,
  getFormCuesForExercise,
  getFormVisionPreferences,
  getLiveVisionCaptureProfile,
  getNearbyExerciseCatalog,
  LIVE_VISION_LOW_CONFIDENCE,
  LIVE_VISION_STABLE_CONFIDENCE,
  markFormVisionOpened,
  requestCameraStream,
  stopMediaStream,
} from '../../services/formVision.js'
import { analyzeFormVision, getAthletyxHealth } from '../../services/athletyxService.js'

/** @typedef {'cue' | 'camera' | 'live'} VisionMode */

const FRAMING_HINT =
  'Prop phone ~6–8 ft away, side or 45° view, full body in frame.'

export default function FormVisionPanel({ exerciseName, onClose, onDetectedExercise }) {
  const titleId = useId()
  const descId = useId()
  const liveId = useId()
  const closeRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const analysisGenRef = useRef(0)
  const inFlightRef = useRef(false)
  const priorDetectionRef = useRef(null)
  const stableHitsRef = useRef(0)
  const abortRef = useRef(null)
  const motionGateRef = useRef(createMotionGate())
  const lastAnalyzedAtRef = useRef(null)

  const cueSet = getFormCuesForExercise(exerciseName)
  const prefs = getFormVisionPreferences()
  const profile = getLiveVisionCaptureProfile()

  const initialMode = (() => {
    if (prefs.preferCamera && prefs.liveVisionEnabled && prefs.cloudConsent) return 'live'
    if (prefs.preferCamera) return 'camera'
    return 'cue'
  })()

  /** @type {[VisionMode, function]} */
  const [mode, setMode] = useState(initialMode)
  const [cueIndex, setCueIndex] = useState(0)
  const [cameraError, setCameraError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [geminiOk, setGeminiOk] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [idleSkip, setIdleSkip] = useState(false)
  const [liveError, setLiveError] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [ageLabel, setAgeLabel] = useState(null)

  const useCamera = mode === 'camera' || mode === 'live'
  const activeCue = cueSet.cues[cueIndex] ?? cueSet.cues[0]

  const lowConfidence =
    analysis != null &&
    typeof analysis.confidence === 'number' &&
    analysis.confidence < LIVE_VISION_LOW_CONFIDENCE

  const liveCue = lowConfidence
    ? FRAMING_HINT
    : analysis?.cues?.[0] ||
      analysis?.summary ||
      (analyzing
        ? 'Analyzing movement…'
        : idleSkip
          ? 'Waiting for movement…'
          : 'Live Vision will describe your movement here.')

  useEffect(() => {
    markFormVisionOpened()
    closeRef.current?.focus()
    getAthletyxHealth().then((h) => {
      setGeminiOk(Boolean(h.ok && (h.geminiAvailable || h.features?.includes('live_form_vision'))))
    })
  }, [])

  useEffect(() => {
    if (mode !== 'live' || updatedAt == null) {
      setAgeLabel(null)
      return undefined
    }
    function tickAge() {
      setAgeLabel(formatRelativeAge(updatedAt))
    }
    tickAge()
    const id = window.setInterval(tickAge, 1000)
    return () => window.clearInterval(id)
  }, [mode, updatedAt])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
      if (mode !== 'live') {
        if (e.key === 'ArrowRight') {
          setCueIndex((i) => (i + 1) % cueSet.cues.length)
        }
        if (e.key === 'ArrowLeft') {
          setCueIndex((i) => (i - 1 + cueSet.cues.length) % cueSet.cues.length)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cueSet.cues.length, onClose, mode])

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
        setMode('cue')
      }
    }

    start()
    return () => {
      cancelled = true
      stopMediaStream(streamRef.current)
      streamRef.current = null
    }
  }, [useCamera])

  // Live Vision polling loop — schedule from completion, motion gate, abort
  useEffect(() => {
    if (mode !== 'live' || !cameraReady) return undefined
    if (!prefs.cloudConsent) {
      setLiveError('Enable cloud analysis consent in Settings to use Live Vision.')
      return undefined
    }

    let cancelled = false
    let timerId = null
    motionGateRef.current.reset()
    stableHitsRef.current = 0

    function scheduleNext(ms) {
      if (cancelled) return
      timerId = window.setTimeout(runTick, ms)
    }

    function currentInterval(forceFast) {
      const p = getLiveVisionCaptureProfile()
      if (forceFast) return Math.min(800, p.baseIntervalMs)
      if (stableHitsRef.current >= 2) return p.stableIntervalMs
      return p.baseIntervalMs
    }

    async function runTick() {
      if (cancelled) return
      if (document.visibilityState === 'hidden') {
        scheduleNext(currentInterval(false))
        return
      }
      if (inFlightRef.current) {
        scheduleNext(currentInterval(false))
        return
      }

      const video = videoRef.current
      if (!video || video.readyState < 2) {
        scheduleNext(currentInterval(false))
        return
      }

      const gate = motionGateRef.current.sample(video)
      if (gate.idle && lastAnalyzedAtRef.current != null) {
        setIdleSkip(true)
        setAnalyzing(false)
        scheduleNext(currentInterval(false))
        return
      }
      setIdleSkip(false)

      const gen = ++analysisGenRef.current
      inFlightRef.current = true
      setAnalyzing(true)
      setLiveError('')

      if (abortRef.current) {
        try {
          abortRef.current.abort()
        } catch {
          /* ignore */
        }
      }
      const controller = new AbortController()
      abortRef.current = controller

      const p = getLiveVisionCaptureProfile()
      try {
        const images = await captureVideoFrames(video, {
          count: p.frameCount,
          intervalMs: p.frameGapMs,
          maxWidth: p.maxWidth,
          quality: p.quality,
        })
        if (cancelled || gen !== analysisGenRef.current) return

        const result = await analyzeFormVision({
          images,
          loggedExercise: exerciseName,
          catalog: getNearbyExerciseCatalog(exerciseName),
          priorDetection: priorDetectionRef.current || undefined,
          signal: controller.signal,
        })
        if (cancelled || gen !== analysisGenRef.current) return

        const prev = priorDetectionRef.current
        priorDetectionRef.current = result.detected_exercise
        if (
          result.confidence >= LIVE_VISION_STABLE_CONFIDENCE &&
          prev &&
          prev.toLowerCase() === String(result.detected_exercise || '').toLowerCase()
        ) {
          stableHitsRef.current += 1
        } else if (result.confidence < LIVE_VISION_STABLE_CONFIDENCE) {
          stableHitsRef.current = 0
        } else if (!prev) {
          stableHitsRef.current = 1
        } else {
          stableHitsRef.current = 1
        }

        lastAnalyzedAtRef.current = Date.now()
        setUpdatedAt(lastAnalyzedAtRef.current)
        setAnalysis(result)
      } catch (err) {
        if (cancelled || gen !== analysisGenRef.current) return
        if (err?.name === 'AbortError') return
        setLiveError(err?.message || 'Live Vision analysis failed.')
      } finally {
        if (gen === analysisGenRef.current) {
          inFlightRef.current = false
          setAnalyzing(false)
        }
        if (!cancelled) {
          scheduleNext(currentInterval(false))
        }
      }
    }

    scheduleNext(600)
    return () => {
      cancelled = true
      analysisGenRef.current += 1
      inFlightRef.current = false
      if (timerId) window.clearTimeout(timerId)
      if (abortRef.current) {
        try {
          abortRef.current.abort()
        } catch {
          /* ignore */
        }
      }
    }
  }, [mode, cameraReady, exerciseName, prefs.cloudConsent])

  function selectMode(next) {
    if (next === 'live') {
      if (!prefs.cloudConsent) {
        setLiveError('Enable cloud analysis consent in Settings first.')
        setMode('camera')
        return
      }
      if (geminiOk === false) {
        setLiveError('Live Vision API unavailable — set GEMINI_API_KEY on the Athletyx server.')
      }
    }
    setLiveError('')
    setMode(next)
  }

  const mismatch =
    analysis &&
    exerciseName &&
    analysis.matches_logged === false &&
    analysis.detected_exercise &&
    analysis.detected_exercise.toLowerCase() !== String(exerciseName).toLowerCase()

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
              Opt-in coaching. Live Vision detects your movement with Gemini. Not medical advice —
              stop if you feel sharp pain.
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
            onClick={() => selectMode('cue')}
            className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs ${
              mode === 'cue'
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                : 'border-zinc-700 text-zinc-400'
            }`}
            aria-pressed={mode === 'cue'}
          >
            <EyeOff className="h-3.5 w-3.5" />
            Cue only
          </button>
          <button
            type="button"
            data-testid="form-vision-camera-mode"
            onClick={() => selectMode('camera')}
            className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs ${
              mode === 'camera'
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                : 'border-zinc-700 text-zinc-400'
            }`}
            aria-pressed={mode === 'camera'}
          >
            <Camera className="h-3.5 w-3.5" />
            Camera
          </button>
          <button
            type="button"
            data-testid="form-vision-live-mode"
            onClick={() => selectMode('live')}
            className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs ${
              mode === 'live'
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                : 'border-zinc-700 text-zinc-400'
            }`}
            aria-pressed={mode === 'live'}
          >
            <Radio className="h-3.5 w-3.5" />
            Live Vision
          </button>
        </div>

        {mode === 'live' ? (
          <p
            className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[11px] text-zinc-400"
            data-testid="form-vision-framing-hint"
          >
            {FRAMING_HINT}
          </p>
        ) : null}

        {useCamera ? (
          <div className="mb-3 overflow-hidden rounded-2xl border border-zinc-800 bg-black">
            <video
              ref={videoRef}
              className="aspect-video w-full object-cover"
              playsInline
              muted
              aria-label="Live camera preview for form coaching"
            />
            {!cameraReady && !cameraError ? (
              <p className="p-3 text-center text-xs text-zinc-500">Starting camera…</p>
            ) : null}
            {mode === 'live' && cameraReady ? (
              <div className="flex items-center justify-between gap-2 border-t border-zinc-800 bg-zinc-950/90 px-3 py-2 text-[10px] text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  {analyzing ? (
                    <Loader2 className="h-3 w-3 animate-spin text-cyan-400" aria-hidden />
                  ) : idleSkip ? (
                    <span className="h-2 w-2 rounded-full bg-zinc-500" aria-hidden />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                  )}
                  {analyzing
                    ? 'Analyzing…'
                    : idleSkip
                      ? 'Idle — skipping cloud call'
                      : 'Listening for movement'}
                </span>
                <span className="inline-flex items-center gap-2">
                  {ageLabel ? <span data-testid="form-vision-freshness">{ageLabel}</span> : null}
                  {analysis?.confidence != null ? (
                    <span>{Math.round(analysis.confidence * 100)}%</span>
                  ) : null}
                </span>
              </div>
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

        {liveError ? (
          <p className="mb-3 text-xs text-amber-400" role="alert" data-testid="form-vision-live-error">
            {liveError}
          </p>
        ) : null}

        {mismatch && !lowConfidence ? (
          <div
            className="mb-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3"
            data-testid="form-vision-mismatch"
          >
            <p className="text-xs font-semibold text-amber-200">Movement mismatch</p>
            <p className="mt-1 text-xs text-amber-100/90">
              Logged <span className="font-medium">{exerciseName}</span>, but Live Vision sees{' '}
              <span className="font-medium">{analysis.detected_exercise}</span>.
            </p>
            {typeof onDetectedExercise === 'function' ? (
              <button
                type="button"
                data-testid="form-vision-use-detected"
                onClick={() => onDetectedExercise(analysis.detected_exercise)}
                className="mt-2 w-full rounded-xl border border-amber-500/40 bg-amber-500/20 py-2 text-xs font-semibold text-amber-100"
              >
                Use detected exercise
              </button>
            ) : null}
          </div>
        ) : null}

        {mode === 'live' ? (
          <>
            {analysis?.detected_exercise && !lowConfidence ? (
              <p
                className="mb-2 text-xs text-zinc-400"
                data-testid="form-vision-detected"
              >
                Detected:{' '}
                <span className="font-semibold text-cyan-200">{analysis.detected_exercise}</span>
                {analysis.form_score && analysis.form_score !== 'unknown' ? (
                  <span className="text-zinc-500"> · form {analysis.form_score.replace('_', ' ')}</span>
                ) : null}
              </p>
            ) : null}
            <div
              id={liveId}
              role="status"
              aria-live="polite"
              aria-atomic="true"
              data-testid="form-vision-live-cue"
              className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-zinc-100"
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-400">
                {lowConfidence ? 'Framing' : 'Live cue'}
              </p>
              <p>{liveCue}</p>
            </div>
            {!lowConfidence && analysis?.faults?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-400">
                {analysis.faults.slice(0, 4).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <>
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
          </>
        )}

        <p className="mt-3 text-[10px] text-zinc-600">
          {mode === 'live'
            ? `Mobile-optimized: ~${Math.round(profile.baseIntervalMs / 1000)}s poll, idle skips, smaller frames. Not stored by IronLog.`
            : 'Switch to Live Vision for Gemini movement detection and live form cues.'}
        </p>
      </div>
    </div>
  )
}
