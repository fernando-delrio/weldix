import { API_BASE_URL } from '../../core/lib/api'

const TOKEN_KEY = 'weldix_access_token'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
})

const jsonHeaders = () => ({
  ...authHeaders(),
  'Content-Type': 'application/json',
})

export const getEquipos = async () => {
  const res = await fetch(`${API_BASE_URL}/equipos`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener equipos')
  return res.json()
}

export const getAlertasEquipos = async () => {
  const res = await fetch(`${API_BASE_URL}/equipos/alertas`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener alertas de equipos')
  return res.json()
}

export const createEquipo = async (data) => {
  const res = await fetch(`${API_BASE_URL}/equipos`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al crear el equipo')
  }
  return res.json()
}

export const updateEquipoEstado = async (equipoId, estado) => {
  const res = await fetch(`${API_BASE_URL}/equipos/${equipoId}/estado`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ estado }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al cambiar el estado del equipo')
  }
  return res.json()
}

export const updateEquipo = async (equipoId, data) => {
  const res = await fetch(`${API_BASE_URL}/equipos/${equipoId}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al actualizar el equipo')
  return res.json()
}

export const deleteEquipo = async (equipoId) => {
  const res = await fetch(`${API_BASE_URL}/equipos/${equipoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al eliminar el equipo')
}
