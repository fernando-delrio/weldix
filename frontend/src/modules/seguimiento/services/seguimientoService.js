import { API_BASE_URL } from '../../core/lib/api'

export const getPublicJobStatus = async (token) => {
  const res = await fetch(`${API_BASE_URL}/seguimiento/${token}`)
  if (res.status === 404) throw new Error('Enlace no válido o trabajo no encontrado')
  if (!res.ok) throw new Error('Error al obtener el estado del trabajo')
  return res.json()
}
