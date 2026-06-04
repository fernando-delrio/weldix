import { API_BASE_URL } from '../../core/lib/api'

const getToken = () => localStorage.getItem('weldix_access_token')

const authPost = async (path, body) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Error al procesar el pago')
  return data
}

const authGet = async (path) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Error al obtener datos de facturación')
  return data
}

export const billingService = {
  // Genera URL de Stripe Checkout.
  // El backend calcula el precio según los operarios actuales del taller.
  // El llamador debe redirigir window.location.href a checkout_url.
  getCheckoutUrl: async () => {
    const data = await authPost('/billing/checkout', {})
    return data // { checkout_url, num_seats, precio_total }
  },

  // Genera URL del Customer Portal de Stripe (ver facturas, cancelar, cambiar tarjeta).
  getPortalUrl: async () => {
    const data = await authGet('/billing/portal')
    return data.portal_url
  },

  // Estado de suscripción del taller (plan, subscription_status, trial_expires_at).
  getStatus: async () => authGet('/billing/status'),
}
