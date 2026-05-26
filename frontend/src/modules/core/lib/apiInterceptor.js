// Redirige al paywall cuando el backend responde 402 (trial expirado).
// Se instala una sola vez al arrancar la app, envolviendo window.fetch.
//
// Why aquí y no en cada service: hay ~17 services con su propio fetch. Un
// interceptor único evita tocar los 17 y garantiza que CUALQUIER 402 — venga
// del endpoint que venga — lleve al usuario a contratar. El único origen de
// 402 es require_active_trial en el backend, así que no hay falsos positivos.
const TRIAL_EXPIRED_PATH = '/trial-expirado'

export const installApiInterceptor = () => {
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (...args) => {
    const response = await originalFetch(...args)
    const trialExpired = response.status === 402
    const alreadyOnPaywall = window.location.pathname === TRIAL_EXPIRED_PATH
    if (trialExpired && !alreadyOnPaywall) {
      window.location.href = TRIAL_EXPIRED_PATH
    }
    return response
  }
}
