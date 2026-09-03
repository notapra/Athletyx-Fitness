/**
 * Form Vision — opt-in computer-vision form coaching.
 * Camera is optional; cue mode works without video for accessibility.
 * Live Vision samples frames and sends them to Athletyx (Gemini) for analysis.
 * Mobile-aware: smaller JPEGs, motion gate, adaptive intervals.
 */

import { EXERCISE_DATABASE } from '../data/exercises.js'
import { listSupportedFormExercises, resolveFormCueSet } from '../utils/formCues.js'

const STORAGE_KEY = 'ironlog_form_vision_prefs_v1'

const DEFAULT_PREFS = {
  enabled: false,
  preferCamera: true,
  liveVisionEnabled: true,
  cloudConsent: false,
  lastOpenedAt: null,
}

/** @type {HTMLCanvasElement | null} */
let sharedCanvas = null
/** @type {HTMLCanvasElement | null} */
let motionCanvas = null

const MOTION_W = 64
const MOTION_H = 36
const MOTION_IDLE_THRESHOLD = 12
const MOTION_IDLE_SAMPLES = 3

function readPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function writePrefs(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function getFormVisionPreferences() {
  return readPrefs()
}

export function setFormVisionEnabled(enabled) {
  const prefs = readPrefs()
  prefs.enabled = Boolean(enabled)
  writePrefs(prefs)
  return prefs
}

export function setFormVisionPreferCamera(preferCamera) {
  const prefs = readPrefs()
  prefs.preferCamera = Boolean(preferCamera)
  writePrefs(prefs)
  return prefs
}

export function setFormVisionLiveEnabled(liveVisionEnabled) {
  const prefs = readPrefs()
  prefs.liveVisionEnabled = Boolean(liveVisionEnabled)
  writePrefs(prefs)
  return prefs
}

export function setFormVisionCloudConsent(cloudConsent) {
  const prefs = readPrefs()
  prefs.cloudConsent = Boolean(cloudConsent)
  writePrefs(prefs)
  return prefs
}

export function markFormVisionOpened() {
  const prefs = readPrefs()
  prefs.lastOpenedAt = new Date().toISOString()
  writePrefs(prefs)
  return prefs
}

/** @returns {{ available: boolean, cameraApi: boolean, message: string, supportedExercises: {id:string,title:string}[] }} */
export function getFormVisionStatus() {
  const cameraApi =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  return {
    available: true,
    cameraApi,
    message: cameraApi
      ? 'Opt-in form coaching with Live Vision (Gemini), camera preview, and accessible text cues.'
      : 'Camera API unavailable — cue-only form coaching still works.',
    supportedExercises: listSupportedFormExercises(),
  }
}

export function getFormCuesForExercise(exerciseName) {
  return resolveFormCueSet(exerciseName)
}

/**
 * Coarse network type for capture/poll tuning.
 * @returns {'wifi'|'4g'|'3g'|'2g'|'slow-2g'|'unknown'}
 */
export function getNetworkEffectiveType() {
  try {
    const conn =
      typeof navigator !== 'undefined'
        ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
        : null
    const t = conn?.effectiveType
    if (t === 'slow-2g' || t === '2g' || t === '3g' || t === '4g') return t
  } catch {
    /* ignore */
  }
  return '4g'
}

export function isMobileClient() {
  if (typeof navigator === 'undefined') return false
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) return true
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
}

/**
 * Encode + poll profile for Live Vision.
 * @returns {{ maxWidth: number, quality: number, frameCount: number, frameGapMs: number, baseIntervalMs: number, stableIntervalMs: number, previewWidth: number, previewHeight: number }}
 */
export function getLiveVisionCaptureProfile() {
  const net = getNetworkEffectiveType()
  const mobile = isMobileClient()
  const slow = net === '3g' || net === '2g' || net === 'slow-2g'

  if (slow) {
    return {
      maxWidth: 360,
      quality: 0.45,
      frameCount: 1,
      frameGapMs: 0,
      baseIntervalMs: 4000,
      stableIntervalMs: 6000,
      previewWidth: 640,
      previewHeight: 480,
    }
  }

  if (mobile) {
    return {
      maxWidth: 480,
      quality: 0.55,
      frameCount: 2,
      frameGapMs: 400,
      baseIntervalMs: 3500,
      stableIntervalMs: 5000,
      previewWidth: 640,
      previewHeight: 480,
    }
  }

  return {
    maxWidth: 480,
    quality: 0.55,
    frameCount: 2,
    frameGapMs: 400,
    baseIntervalMs: 2500,
    stableIntervalMs: 5000,
    previewWidth: 640,
    previewHeight: 480,
  }
}

/**
 * Prefer rear camera for gym form; fall back to user-facing.
 * Uses lower preview resolution to save battery on phones.
 */
export async function requestCameraStream(constraints) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not available in this browser.')
  }
  const profile = getLiveVisionCaptureProfile()
  const preferred =
    constraints ??
    {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: profile.previewWidth },
        height: { ideal: profile.previewHeight },
        frameRate: { ideal: 24, max: 30 },
      },
      audio: false,
    }
  try {
    return await navigator.mediaDevices.getUserMedia(preferred)
  } catch {
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', frameRate: { ideal: 24, max: 30 } },
      audio: false,
    })
  }
}

export function stopMediaStream(stream) {
  if (!stream) return
  for (const track of stream.getTracks()) {
    track.stop()
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getSharedCanvas() {
  if (typeof document === 'undefined') return null
  if (!sharedCanvas) sharedCanvas = document.createElement('canvas')
  return sharedCanvas
}

function getMotionCanvas() {
  if (typeof document === 'undefined') return null
  if (!motionCanvas) {
    motionCanvas = document.createElement('canvas')
    motionCanvas.width = MOTION_W
    motionCanvas.height = MOTION_H
  }
  return motionCanvas
}

/**
 * Capture a single JPEG frame from a video element as raw base64 (no data-URL prefix).
 */
export function captureVideoFrame(
  videoEl,
  { maxWidth = 480, quality = 0.55 } = {}
) {
  if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) {
    throw new Error('Camera frame not ready')
  }
  const canvas = getSharedCanvas()
  if (!canvas) throw new Error('Canvas unavailable')
  const scale = Math.min(1, maxWidth / videoEl.videoWidth)
  const w = Math.max(1, Math.round(videoEl.videoWidth * scale))
  const h = Math.max(1, Math.round(videoEl.videoHeight * scale))
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: false })
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(videoEl, 0, 0, w, h)
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}

/**
 * Capture multiple frames spaced apart for motion context.
 * @returns {Promise<string[]>} raw base64 JPEGs
 */
export async function captureVideoFrames(
  videoEl,
  { count = 2, intervalMs = 400, maxWidth = 480, quality = 0.55 } = {}
) {
  const frames = []
  const n = Math.max(1, Math.min(3, count))
  for (let i = 0; i < n; i += 1) {
    frames.push(captureVideoFrame(videoEl, { maxWidth, quality }))
    if (i < n - 1 && intervalMs > 0) await sleep(intervalMs)
  }
  return frames
}

/**
 * Sample a tiny grayscale luminance buffer for motion detection.
 * @returns {Uint8Array | null}
 */
export function sampleMotionLuma(videoEl) {
  if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) return null
  const canvas = getMotionCanvas()
  if (!canvas) return null
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(videoEl, 0, 0, MOTION_W, MOTION_H)
  const { data } = ctx.getImageData(0, 0, MOTION_W, MOTION_H)
  const luma = new Uint8Array(MOTION_W * MOTION_H)
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    luma[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0
  }
  return luma
}

/**
 * Mean absolute difference between two luma buffers.
 */
export function meanLumaDelta(a, b) {
  if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY
  let sum = 0
  for (let i = 0; i < a.length; i += 1) {
    sum += Math.abs(a[i] - b[i])
  }
  return sum / a.length
}

/**
 * Stateful idle detector — skip Gemini when the scene is still.
 */
export function createMotionGate({
  threshold = MOTION_IDLE_THRESHOLD,
  idleSamples = MOTION_IDLE_SAMPLES,
} = {}) {
  let prev = null
  let idleStreak = 0

  return {
    /**
     * @param {HTMLVideoElement} videoEl
     * @returns {{ idle: boolean, delta: number, motion: boolean }}
     */
    sample(videoEl) {
      const luma = sampleMotionLuma(videoEl)
      if (!luma) {
        return { idle: false, delta: Infinity, motion: true }
      }
      const delta = prev ? meanLumaDelta(prev, luma) : Infinity
      prev = luma
      if (delta < threshold) {
        idleStreak += 1
      } else {
        idleStreak = 0
      }
      const idle = idleStreak >= idleSamples
      return { idle, delta, motion: !idle && delta !== Infinity }
    },
    reset() {
      prev = null
      idleStreak = 0
    },
  }
}

/**
 * Logged exercise + same muscle-group neighbors (smaller Gemini prompt).
 * @param {string} exerciseName
 * @returns {string[]}
 */
export function getNearbyExerciseCatalog(exerciseName) {
  const logged = (exerciseName || '').trim()
  const match = EXERCISE_DATABASE.find(
    (e) => e.name.toLowerCase() === logged.toLowerCase()
  )
  if (!match) {
    const fallback = EXERCISE_DATABASE.map((e) => e.name)
    if (logged && !fallback.some((n) => n.toLowerCase() === logged.toLowerCase())) {
      return [logged, ...fallback].slice(0, 24)
    }
    return fallback.slice(0, 24)
  }
  const sameGroup = EXERCISE_DATABASE.filter(
    (e) => e.muscleGroup === match.muscleGroup || e.movementType === match.movementType
  ).map((e) => e.name)
  const names = [match.name, ...sameGroup.filter((n) => n !== match.name)]
  return names.slice(0, 24)
}

export function formatRelativeAge(isoOrMs) {
  if (isoOrMs == null) return null
  const t = typeof isoOrMs === 'number' ? isoOrMs : Date.parse(isoOrMs)
  if (!Number.isFinite(t)) return null
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (sec < 1) return 'just now'
  if (sec === 1) return '1s ago'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  return min === 1 ? '1m ago' : `${min}m ago`
}

/** @deprecated use getLiveVisionCaptureProfile().baseIntervalMs */
export const LIVE_VISION_INTERVAL_MS = 2500
export const LIVE_VISION_FRAME_GAP_MS = 400
export const LIVE_VISION_LOW_CONFIDENCE = 0.45
export const LIVE_VISION_STABLE_CONFIDENCE = 0.8
