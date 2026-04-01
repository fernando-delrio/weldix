import { API_BASE_URL } from '../../core/lib/api'

const TOKEN_KEY = 'weldix_access_token'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
})

export const getJornadaActiva = async () => {
  const res = await fetch(`${API_BASE_URL}/fichajes/activo`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener la jornada activa')
  return res.json()
}

export const iniciarJornada = async () => {
  const res = await fetch(`${API_BASE_URL}/fichajes/iniciar`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al iniciar jornada')
  }
  return res.json()
}

export const finalizarJornada = async (fichajeId) => {
  const res = await fetch(`${API_BASE_URL}/fichajes/${fichajeId}/finalizar`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al finalizar jornada')
  }
  return res.json()
}

export const getMisJornadas = async () => {
  const res = await fetch(`${API_BASE_URL}/fichajes/mis-jornadas`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener historial de jornadas')
  return res.json()
}

export const getTodosLosFichajes = async () => {
  const res = await fetch(`${API_BASE_URL}/fichajes`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener fichajes')
  return res.json()
}
