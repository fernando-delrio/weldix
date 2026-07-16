import { API_BASE_URL } from '../../core/lib/api'

// Único punto de entrada a la API para la demo. Solo hace fetch y lanza el error.
export const startDemo = async (rol = 'admin') => {
  const res = await fetch(`${API_BASE_URL}/auth/demo?rol=${encodeURIComponent(rol)}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('No se pudo iniciar la demo. Inténtalo de nuevo.')
  return res.json()
}
