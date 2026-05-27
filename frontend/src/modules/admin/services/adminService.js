import { API_BASE_URL } from '../../core/lib/api'

const TOKEN_KEY = 'weldix_access_token'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
})

const jsonHeaders = () => ({
  ...authHeaders(),
  'Content-Type': 'application/json',
})

export const getAdminDashboard = async () => {
  const res = await fetch(`${API_BASE_URL}/admin/dashboard`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al cargar el panel de administración')
  return res.json()
}

export const assignJob = async (jobId, operarioId) => {
  const res = await fetch(`${API_BASE_URL}/trabajos/${jobId}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ operario_id: operarioId }),
  })
  if (!res.ok) throw new Error('Error al asignar el trabajo')
  return res.json()
}

export const deleteJob = async (jobId) => {
  const res = await fetch(`${API_BASE_URL}/trabajos/${jobId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al eliminar el trabajo')
}

export const createUser = async (data) => {
  const res = await fetch(`${API_BASE_URL}/auth/admin/signup`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Error al crear el usuario')
  }
  return res.json()
}

export const changeJobStatus = async (jobId, estado) => {
  const res = await fetch(`${API_BASE_URL}/trabajos/${jobId}/estado`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ estado }),
  })
  if (!res.ok) throw new Error('Error al cambiar el estado del trabajo')
  return res.json()
}

export const deleteDemoData = async () => {
  const res = await fetch(`${API_BASE_URL}/admin/demo-data`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al eliminar los datos de demo')
  return res.json()
}
