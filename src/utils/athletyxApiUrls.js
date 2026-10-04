/**
 * Resolve Athletyx API URLs from VITE_ATHLETYX_API_URL.
 * Pure helpers — testable without Vite import.meta.
 */

const DEFAULT_API_PREFIX = '/api/athletyx'

/**
 * @param {string | undefined} envValue - VITE_ATHLETYX_API_URL
 * @returns {{ coachUrl: string, apiRoot: string }}
 */
export function resolveAthletyxUrls(envValue) {
  if (!envValue?.trim()) {
    return {
      coachUrl: `${DEFAULT_API_PREFIX}/coach`,
      apiRoot: DEFAULT_API_PREFIX,
    }
  }

  const base = envValue.trim().replace(/\/$/, '')

  if (base.endsWith('/api/coach')) {
    return {
      coachUrl: base,
      apiRoot: base.slice(0, -'/api/coach'.length),
    }
  }

  if (base.endsWith('/coach')) {
    return {
      coachUrl: base,
      apiRoot: base.slice(0, -'/coach'.length),
    }
  }

  return {
    coachUrl: `${base}/coach`,
    apiRoot: base,
  }
}

/**
 * Build a path to a non-coach API route (nutrition, MCP, etc.).
 * Dev vite proxy rewrites `/api/athletyx/*` → `/api/*`; production uses `/api/*` on the host.
 *
 * @param {string} suffix - e.g. `nutrition/search` or `mcp/session`
 * @param {string | undefined} envValue
 */
export function resolveAthletyxApiPath(suffix, envValue) {
  const { apiRoot } = resolveAthletyxUrls(envValue)
  const root = apiRoot.replace(/\/$/, '')
  const path = suffix.replace(/^\//, '')
  if (root === '/api/athletyx') {
    return `${root}/${path}`
  }
  return `${root}/api/${path}`
}
