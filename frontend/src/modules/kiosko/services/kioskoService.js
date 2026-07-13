import { API_BASE_URL } from '../../core/lib/api'

export const getKioskInfo = async (token) => {
  const res = await fetch(`${API_BASE_URL}/kiosko/${token}`)
  if (res.status === 404) throw new Error('Kiosko no válido')
  if (!res.ok) throw new Error('Error al cargar el kiosko')
  return res.json()
}

export const ficharKiosko = async (token, pin) => {
  const res = await fetch(`${API_BASE_URL}/kiosko/${token}/fichar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? 'No se pudo fichar')
  return data
}
