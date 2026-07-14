import { API_BASE_URL } from '../../core/lib/api'

// Chat de venta del landing — endpoint público, sin auth.
export const sendLandingChat = async (mensaje, historial) => {
  const res = await fetch(`${API_BASE_URL}/ia/landing-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensaje, historial }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? 'No se pudo enviar el mensaje')
  return data.respuesta
}
