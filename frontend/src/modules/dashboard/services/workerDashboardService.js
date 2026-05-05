import { API_BASE_URL } from '../../core/lib/api'
import { mapWorkerDashboardModel } from '../lib/workerDashboardModel'

const TOKEN_KEY = 'weldix_access_token'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
})

const jsonHeaders = () => ({
  ...authHeaders(),
  'Content-Type': 'application/json',
})

export const getWorkerDashboard = async () => {
  const res = await fetch(`${API_BASE_URL}/dashboard/worker`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al cargar el panel de trabajo')
  const data = await res.json()
  return mapWorkerDashboardModel(data)
}

export const advanceJobStatus = async (jobId, newEstado, newProgreso) => {
  const res = await fetch(`${API_BASE_URL}/trabajos/${jobId}/estado`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ estado: newEstado, progreso: newProgreso }),
  })
  if (!res.ok) throw new Error('Error al actualizar el estado del trabajo')
  return res.json()
}

export const createJob = async (data) => {
  const res = await fetch(`${API_BASE_URL}/trabajos`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al crear el trabajo')
  return res.json()
}

export const getJobByCode = async (code) => {
  const res = await fetch(
    `${API_BASE_URL}/trabajos/buscar?code=${encodeURIComponent(code.toUpperCase())}`,
    { headers: authHeaders() }
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'OT no encontrada')
  }
  return res.json()
}

// Usa el endpoint /consume — el servidor valida y descuenta server-side
export const consumeMaterial = async (materialId, consumed) => {
  const res = await fetch(`${API_BASE_URL}/stock/${materialId}/consume`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ consumed }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Error al actualizar el stock')
  }
  return res.json()
}

export const getOperarios = async () => {
  const res = await fetch(`${API_BASE_URL}/auth/users`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener operarios')
  const users = await res.json()
  return users.filter((u) => u.role === 'operario')
}
