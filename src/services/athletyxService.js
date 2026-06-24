/**
 * Athletyx backend client — RAG coaching (keys stay server-side in PRIVATE.env).
 */

import { getAccessToken } from './supabaseClient.js'

const DEFAULT_BASE = '/api/athletyx'

export function getAthletyxBaseUrl() {
  return import.meta.env.VITE_ATHLETYX_API_URL || DEFAULT_BASE
}

function healthBaseUrl() {
  return getAthletyxBaseUrl().replace(/\/coach$/, '')
}

export async function getAthletyxHealth() {
  try {
    const res = await fetch(`${healthBaseUrl()}/health`)
    if (!res.ok) return { ok: false }
    const data = await res.json()
    return {
      ok: data?.status === 'ok',
      webSearchAvailable: data?.web_search_available === true,
      openaiAvailable: data?.openai_available === true,
      features: data?.features ?? [],
    }
  } catch {
    return { ok: false, webSearchAvailable: false, openaiAvailable: false, features: [] }
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
  const base = getAthletyxBaseUrl()
  const url = base.endsWith('/coach') ? base : `${base.replace(/\/$/, '')}/coach`

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

  // Explicit false skips SerpAPI/DDG on the server; omit when web search is available and desired
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
