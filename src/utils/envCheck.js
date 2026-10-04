/**
 * Warn in console when production/staging env vars are missing.
 */

export function validateClientEnv() {
  if (import.meta.env.DEV) return

  const missing = []
  if (!import.meta.env.VITE_SUPABASE_URL?.trim()) missing.push('VITE_SUPABASE_URL')
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()) missing.push('VITE_SUPABASE_ANON_KEY')

  if (missing.length) {
    console.warn(
      `[IronLog] Missing env: ${missing.join(', ')}. Cloud sync and auth will be disabled.`
    )
  }

  const apiUrl = import.meta.env.VITE_ATHLETYX_API_URL?.trim()
  if (!apiUrl) {
    console.warn('[IronLog] VITE_ATHLETYX_API_URL not set — IronCoach will use offline answers only.')
  }
}
