/**
 * Form Vision — opt-in computer-vision form coaching.
 * Camera is optional; cue mode works without video for accessibility.
 */

import { listSupportedFormExercises, resolveFormCueSet } from '../utils/formCues.js'

const STORAGE_KEY = 'ironlog_form_vision_prefs_v1'

function readPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw
      ? JSON.parse(raw)
      : { enabled: false, preferCamera: true, lastOpenedAt: null }
  } catch {
    return { enabled: false, preferCamera: true, lastOpenedAt: null }
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
      ? 'Opt-in form coaching with optional camera preview and accessible text cues.'
      : 'Camera API unavailable — cue-only form coaching still works.',
    supportedExercises: listSupportedFormExercises(),
  }
}

export function getFormCuesForExercise(exerciseName) {
  return resolveFormCueSet(exerciseName)
}

export async function requestCameraStream(constraints = { video: { facingMode: 'user' }, audio: false }) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not available in this browser.')
  }
  return navigator.mediaDevices.getUserMedia(constraints)
}

export function stopMediaStream(stream) {
  if (!stream) return
  for (const track of stream.getTracks()) {
    track.stop()
  }
}
