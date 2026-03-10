import { API_BASE_URL } from '../../core/lib/api'

const TOKEN_KEY = 'weldix_access_token'

const jsonHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
  'Content-Type': 'application/json',
})

export const consultarIA = async (mensaje, historial = []) => {
  const res = await fetch(`${API_BASE_URL}/ia/consulta`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ mensaje, historial }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Error al contactar con la IA')
  }
  const data = await res.json()
  return data.respuesta
}
