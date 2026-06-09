/**
 * Athletyx backend client — RAG + SerpAPI coaching (keys stay server-side in PRIVATE.env).
 */

const DEFAULT_BASE = '/api/athletyx'

export function getAthletyxBaseUrl() {
  return import.meta.env.VITE_ATHLETYX_API_URL || DEFAULT_BASE
}

export async function checkAthletyxHealth() {
  try {
    const base = getAthletyxBaseUrl().replace(/\/coach$/, '')
    const res = await fetch(`${base}/health`)
    if (!res.ok) return false
    const data = await res.json()
    return data?.status === 'ok'
  } catch {
    return false
  }
}

/**
 * Full Athletyx coach: personalization + document RAG + optional DuckDuckGo via SerpAPI.
 */
export async function sendAthletyxCoachMessage(message, { profile, goals = [], analysis, useWebSearch }) {
  const base = getAthletyxBaseUrl()
  const url = base.endsWith('/coach') ? base : `${base.replace(/\/$/, '')}/coach`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
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
      use_web_search: useWebSearch,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Athletyx API error ${response.status}`)
  }

  return response.json()
}
