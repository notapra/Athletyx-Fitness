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
  ensureLiveVisionPrefs,
  formatRelativeAge,
  getFormCuesForExercise,
  getLiveVisionCaptureProfile,
  getNearbyExerciseCatalog,
  LIVE_VISION_LOW_CONFIDENCE,
  markFormVisionOpened,
  requestCameraStream,
  stopMediaStream,
} from '../../services/formVision.js'
import { analyzeFormVision, getAthletyxHealth } from '../../services/athletyxService.js'
import { GeminiLiveClient } from '../../services/geminiLiveClient.js'

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
  const priorDetectionRef = useRef(null)
  const motionGateRef = useRef(createMotionGate())
  const lastAnalyzedAtRef = useRef(null)
  const liveClientRef = useRef(null)

  const cueSet = getFormCuesForExercise(exerciseName)
  const prefs = ensureLiveVisionPrefs()

  const initialMode = 'live'

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

  const [streamStats, setStreamStats] = useState(null)
  const [transport, setTransport] = useState('ws') // ws | rest

  const useCamera = mode === 'camera' || mode === 'live'
  const activeCue = cueSet.cues[cueIndex] ?? cueSet.cues[0]

  const lowConfidence =
    analysis != null &&
    typeof analysis.confidence === 'number' &&
    analysis.confidence < LIVE_VISION_LOW_CONFIDENCE

  useEffect(() => {
    ensureLiveVisionPrefs()
    markFormVisionOpened()
    closeRef.current?.focus()
    getAthletyxHealth().then((h) => {
      const ok = Boolean(h.ok && (h.geminiAvailable || h.features?.includes('live_form_vision')))
      setGeminiOk(ok)
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

  // Gemini Live WebSocket pipeline (primary); REST poll fallback
  useEffect(() => {
    if (mode !== 'live' || !cameraReady) return undefined
    ensureLiveVisionPrefs()

    let cancelled = false
    let timerId = null
    let pingId = null
    let usingRest = false
    motionGateRef.current.reset()

    const client = new GeminiLiveClient({
      onOpen: () => {
        if (cancelled) return
        setTransport('ws')
        setLiveError('')
      },
      onError: (err) => {
        if (cancelled) return
        setLiveError(err?.message || 'Live WebSocket error')
      },
      onClose: () => {
        if (cancelled || usingRest) return
        // Fall back to REST snapshot loop if WS drops before useful data
        if (!lastAnalyzedAtRef.current) {
          usingRest = true
          setTransport('rest')
          setLiveError('Live WS unavailable — falling back to REST snapshots.')
          scheduleRest(800)
        }
      },
      onMessage: (msg) => {
        if (cancelled) return
        if (msg.type === 'error') {
          setLiveError(msg.message || 'Live gateway error')
          if (msg.retryable === false && !lastAnalyzedAtRef.current) {
            usingRest = true
            setTransport('rest')
            scheduleRest(800)
          }
          return
        }
        if (msg.type === 'reconnecting') {
          setLiveError(`Reconnecting to Gemini Live (attempt ${msg.attempt})…`)
          return
        }
        if (msg.type === 'ready') {
          setLiveError('')
          setAnalyzing(true)
          return
        }
        if (msg.type === 'model_text' && msg.text) {
          setAnalysis((prev) => ({
            detected_exercise: prev?.detected_exercise || priorDetectionRef.current || '…',
            confidence: prev?.confidence ?? 0,
            matches_logged: prev?.matches_logged ?? false,
            form_score: prev?.form_score || 'unknown',
            faults: prev?.faults || [],
            cues: prev?.cues || [],
            summary: msg.text,
            powered_by: prev?.powered_by || 'Gemini Live',
          }))
          lastAnalyzedAtRef.current = Date.now()
          setUpdatedAt(lastAnalyzedAtRef.current)
          setAnalyzing(false)
          return
        }
        if (msg.type === 'tool_call' && msg.name === 'report_detected_exercise') {
          const args = msg.args || {}
          const detected = String(args.detected_exercise || 'Unknown')
          priorDetectionRef.current = detected
          const result = {
            detected_exercise: detected,
            confidence: Number(args.confidence) || 0,
            matches_logged: Boolean(
              exerciseName &&
                detected.toLowerCase().includes(String(exerciseName).toLowerCase().slice(0, 4))
            ),
            form_score: args.form_score || 'unknown',
            faults: Array.isArray(args.faults) ? args.faults : [],
            cues: Array.isArray(args.cues) ? args.cues : [],
            summary: args.summary || detected,
            powered_by: 'Gemini Live (tool)',
          }
          setAnalysis(result)
          lastAnalyzedAtRef.current = Date.now()
          setUpdatedAt(lastAnalyzedAtRef.current)
          setAnalyzing(false)
          setLiveError('')
          return
        }
        if (msg.type === 'stats') {
          setStreamStats(msg)
        }
        if (msg.type === 'go_away') {
          setLiveError('Gemini Live GoAway — session ending; will reconnect if possible.')
        }
      },
    })
    liveClientRef.current = client

    try {
      client.start({
        loggedExercise: exerciseName,
        catalog: getNearbyExerciseCatalog(exerciseName),
      })
    } catch (err) {
      usingRest = true
      setTransport('rest')
      setLiveError(err?.message || 'Could not start Live WS')
      scheduleRest(800)
    }

    function scheduleRest(ms) {
      if (cancelled) return
      timerId = window.setTimeout(runRestTick, ms)
    }

    async function runRestTick() {
      if (cancelled || !usingRest) return
      if (document.visibilityState === 'hidden') {
        scheduleRest(2500)
        return
      }
      const video = videoRef.current
      if (!video || video.readyState < 2) {
        scheduleRest(1500)
        return
      }
      const gate = motionGateRef.current.sample(video)
      if (gate.idle && lastAnalyzedAtRef.current != null) {
        setIdleSkip(true)
        scheduleRest(2500)
        return
      }
      setIdleSkip(false)
      setAnalyzing(true)
      try {
        const p = getLiveVisionCaptureProfile()
        const images = await captureVideoFrames(video, {
          count: 1,
          intervalMs: 0,
          maxWidth: p.maxWidth,
          quality: p.quality,
        })
        if (cancelled) return
        const result = await analyzeFormVision({
          images,
          loggedExercise: exerciseName,
          catalog: getNearbyExerciseCatalog(exerciseName),
          priorDetection: priorDetectionRef.current || undefined,
        })
        if (cancelled) return
        priorDetectionRef.current = result.detected_exercise
        setAnalysis(result)
        lastAnalyzedAtRef.current = Date.now()
        setUpdatedAt(lastAnalyzedAtRef.current)
        setLiveError('')
      } catch (err) {
        if (!cancelled) setLiveError(err?.message || 'REST vision failed')
      } finally {
        if (!cancelled) {
          setAnalyzing(false)
          scheduleRest(2500)
        }
      }
    }

    function frameTick() {
      if (cancelled || usingRest) return
      if (document.visibilityState === 'hidden') {
        timerId = window.setTimeout(frameTick, 1000)
        return
      }
      const video = videoRef.current
      if (!video || video.readyState < 2) {
        timerId = window.setTimeout(frameTick, 500)
        return
      }
      const gate = motionGateRef.current.sample(video)
      if (gate.idle && lastAnalyzedAtRef.current != null) {
        setIdleSkip(true)
        timerId = window.setTimeout(frameTick, 1000)
        return
      }
      setIdleSkip(false)
      setAnalyzing(true)
      try {
        const result = client.sendVideoFrame(video, { maxWidth: 720, quality: 0.75 })
        if (result.sent) {
          setStreamStats({
            framesAccepted: client.stats.framesSent,
            lastFrameBytes: result.bytesApprox,
            dropped: false,
          })
        }
      } catch (err) {
        setLiveError(err?.message || 'Frame send failed')
      }
      timerId = window.setTimeout(frameTick, 1000)
    }

    timerId = window.setTimeout(frameTick, 700)
    pingId = window.setInterval(() => {
      try {
        if (!usingRest) client.ping()
      } catch {
        /* ignore */
      }
    }, 20000)

    return () => {
      cancelled = true
      if (timerId) window.clearTimeout(timerId)
      if (pingId) window.clearInterval(pingId)
      client.stop()
      liveClientRef.current = null
    }
  }, [mode, cameraReady, exerciseName, prefs.cloudConsent])

  function selectMode(next) {
    if (next === 'live') {
      ensureLiveVisionPrefs()
      if (geminiOk === false) {
        setLiveError('Live Vision API unavailable — start Athletyx API with GEMINI_API_KEY set.')
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
              Live Vision — motion detect
            </h2>
            <p id={descId} className="mt-1 text-xs text-zinc-500">
              Gemini assumes the movement from your camera and streams raw analysis. Cloud
              consent is auto-enabled for Live Vision. Not medical advice.
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
                  <span className="uppercase tracking-wide text-zinc-500">
                    {transport === 'ws' ? 'ws' : 'rest'}
                  </span>
                  {streamStats?.lastFrameBytes ? (
                    <span>{Math.round(streamStats.lastFrameBytes / 1024)}KB</span>
                  ) : null}
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
            <div
              id={liveId}
              role="status"
              aria-live="polite"
              aria-atomic="true"
              data-testid="form-vision-live-cue"
              className="mb-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4"
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-400">
                Assumed workout right now
              </p>
              <p className="text-xl font-bold text-white" data-testid="form-vision-detected">
                {analyzing && !analysis
                  ? 'Analyzing…'
                  : analysis?.detected_exercise ||
                    (idleSkip ? 'Waiting for movement…' : '—')}
              </p>
              {analysis?.summary ? (
                <p className="mt-1 text-sm text-zinc-300">{analysis.summary}</p>
              ) : null}
              {lowConfidence ? (
                <p className="mt-2 text-xs text-amber-300">{FRAMING_HINT}</p>
              ) : null}
            </div>

            <div
              className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3"
              data-testid="form-vision-raw-analysis"
            >
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Raw Gemini analysis
              </p>
              {analysis ? (
                <dl className="space-y-2 text-xs text-zinc-300">
                  <div className="flex justify-between gap-3">
                    <dt className="text-zinc-500">detected_exercise</dt>
                    <dd className="font-mono text-cyan-200">{analysis.detected_exercise}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-zinc-500">confidence</dt>
                    <dd className="font-mono">
                      {typeof analysis.confidence === 'number'
                        ? analysis.confidence.toFixed(3)
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-zinc-500">matches_logged</dt>
                    <dd className="font-mono">{String(analysis.matches_logged)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-zinc-500">form_score</dt>
                    <dd className="font-mono">{analysis.form_score ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">faults</dt>
                    <dd className="mt-1 font-mono text-[11px] text-zinc-400">
                      {analysis.faults?.length
                        ? JSON.stringify(analysis.faults, null, 2)
                        : '[]'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">cues</dt>
                    <dd className="mt-1 font-mono text-[11px] text-zinc-400">
                      {analysis.cues?.length
                        ? JSON.stringify(analysis.cues, null, 2)
                        : '[]'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">summary</dt>
                    <dd className="mt-1 font-mono text-[11px] text-zinc-400">
                      {analysis.summary || '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-zinc-500">powered_by</dt>
                    <dd className="font-mono text-[11px]">{analysis.powered_by || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-zinc-500">logged_exercise</dt>
                    <dd className="font-mono text-[11px]">{exerciseName || '—'}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-xs text-zinc-500">
                  {analyzing
                    ? 'Waiting for first Gemini response…'
                    : 'No analysis yet — move in frame.'}
                </p>
              )}
            </div>
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
            ? 'Now: raw detection feed. Coach-style live cues are Stage 11 (future).'
            : 'Switch to Live Vision for Gemini movement detection.'}
        </p>
      </div>
    </div>
  )
}
