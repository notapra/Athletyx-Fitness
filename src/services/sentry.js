/**
 * Optional Sentry — set VITE_SENTRY_DSN in production env.
 */

let initialized = false

export async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()
  if (!dsn || initialized) return

  try {
    const Sentry = await import('@sentry/react')
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
    })
    initialized = true
  } catch (e) {
    console.warn('Sentry init skipped', e)
  }
}
