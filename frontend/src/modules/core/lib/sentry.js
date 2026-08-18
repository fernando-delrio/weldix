import * as Sentry from '@sentry/react'

// Silencioso si VITE_SENTRY_DSN no está configurado -- mismo criterio que
// el backend con SENTRY_DSN, no rompe nada en dev/tests.
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  })
}
