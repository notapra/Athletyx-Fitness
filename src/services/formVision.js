/**
 * Form Vision — opt-in computer-vision form coaching.
 * Camera is optional; cue mode works without video for accessibility.
 * Live Vision samples frames and sends them to Athletyx (Gemini) for analysis.
 */

import { listSupportedFormExercises, resolveFormCueSet } from '../utils/formCues.js'

const STORAGE_KEY = 'ironlog_form_vision_prefs_v1'

const DEFAULT_PREFS = {
  enabled: false,
  preferCamera: true,
  liveVisionEnabled: true,
  cloudConsent: false,
  lastOpenedAt: null,
}

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
 * Prefer rear camera for gym form; fall back to user-facing.
 */
export async function requestCameraStream(
  constraints = {
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  }
) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not available in this browser.')
  }
  try {
    return await navigator.mediaDevices.getUserMedia(constraints)
  } catch {
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
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

/**
 * Capture a single JPEG frame from a video element as raw base64 (no data-URL prefix).
 */
export function captureVideoFrame(
  videoEl,
  { maxWidth = 640, quality = 0.7 } = {}
) {
  if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) {
    throw new Error('Camera frame not ready')
  }
  const scale = Math.min(1, maxWidth / videoEl.videoWidth)
  const w = Math.max(1, Math.round(videoEl.videoWidth * scale))
  const h = Math.max(1, Math.round(videoEl.videoHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
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
  { count = 2, intervalMs = 400, maxWidth = 640, quality = 0.7 } = {}
) {
  const frames = []
  const n = Math.max(1, Math.min(3, count))
  for (let i = 0; i < n; i += 1) {
    frames.push(captureVideoFrame(videoEl, { maxWidth, quality }))
    if (i < n - 1) await sleep(intervalMs)
  }
  return frames
}

export const LIVE_VISION_INTERVAL_MS = 2500
export const LIVE_VISION_FRAME_GAP_MS = 400
