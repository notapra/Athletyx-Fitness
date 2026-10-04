/**
 * Optional Sentry — set VITE_SENTRY_DSN in production env.
 */

let initialized = false

let SentryModule = null

export async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()
  if (!dsn || initialized) return

  try {
    SentryModule = await import('@sentry/react')
    SentryModule.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
    })
    initialized = true
  } catch (e) {
    console.warn('Sentry init skipped', e)
  }
}

export function captureException(error, context) {
  if (SentryModule?.captureException) {
    SentryModule.captureException(error, context)
  }
}
