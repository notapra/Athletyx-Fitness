/**
 * Athletyx backend client — RAG coaching (keys stay server-side in PRIVATE.env).
 */

import { getAccessToken } from './supabaseClient.js'
import { resolveAthletyxUrls, resolveAthletyxApiPath } from '../utils/athletyxApiUrls.js'

function urls() {
  return resolveAthletyxUrls(import.meta.env.VITE_ATHLETYX_API_URL)
}

/** Full POST target for IronCoach (`…/api/coach`). */
export function getAthletyxCoachUrl() {
  return urls().coachUrl
}

/** API root for `/health` only. */
export function getAthletyxApiRoot() {
  return urls().apiRoot
}

/** Non-coach route path (nutrition, MCP, …). */
export function getAthletyxApiPath(suffix) {
  return resolveAthletyxApiPath(suffix, import.meta.env.VITE_ATHLETYX_API_URL)
}

/** @deprecated Prefer getAthletyxCoachUrl() or getAthletyxApiRoot(). */
export function getAthletyxBaseUrl() {
  return getAthletyxCoachUrl()
}

export async function getAthletyxHealth() {
  try {
    const res = await fetch(`${getAthletyxApiRoot()}/health`)
    if (!res.ok) return { ok: false }
    const data = await res.json()
    return {
      ok: data?.status === 'ok',
      webSearchAvailable: data?.web_search_available === true,
      openaiAvailable: data?.openai_available === true,
      geminiAvailable: data?.gemini_available === true,
      features: data?.features ?? [],
    }
  } catch {
    return {
      ok: false,
      webSearchAvailable: false,
      openaiAvailable: false,
      geminiAvailable: false,
      features: [],
    }
  }
}

export async function checkAthletyxHealth() {
  const health = await getAthletyxHealth()
  return health.ok
}

/**
 * Full Athletyx coach: personalization + document RAG + optional web research when SerpAPI is active.
 */
export async function sendAthletyxCoachMessage(message, { profile, goals = [], analysis, useWebSearch }) {
  const url = getAthletyxCoachUrl()

  const token = await getAccessToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const body = {
    message,
    profile: {
      username: profile?.username,
      fitness_goal: profile?.fitness_goal,
      experience_level: profile?.experience_level,
      units: profile?.units,
      bodyweight: profile?.bodyweight,
      age: profile?.age,
      ai_preferences: profile?.ai_preferences ?? {},
    },
    goals,
    analysis,
  }

  if (useWebSearch === false) {
    body.use_web_search = false
  } else if (useWebSearch === true) {
    body.use_web_search = true
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Athletyx API error ${response.status}`)
  }

  return response.json()
}

/**
 * Live Form Vision — send camera frames to Gemini via Athletyx.
 * @param {{ images: string[], loggedExercise?: string, catalog?: string[], priorDetection?: string }} opts
 */
export async function analyzeFormVision({
  images,
  loggedExercise,
  catalog = [],
  priorDetection,
}) {
  const url = getAthletyxApiPath('form-vision')
  const token = await getAccessToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      images,
      logged_exercise: loggedExercise || null,
      catalog,
      prior_detection: priorDetection || null,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    let detail = text || `Form Vision API error ${response.status}`
    try {
      const parsed = JSON.parse(text)
      if (parsed?.detail) detail = typeof parsed.detail === 'string' ? parsed.detail : text
    } catch {
      /* keep detail */
    }
    const err = new Error(detail)
    err.status = response.status
    throw err
  }

  return response.json()
}
