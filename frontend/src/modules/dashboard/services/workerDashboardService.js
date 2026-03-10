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

export async function getWorkerDashboard() {
  const res = await fetch(`${API_BASE_URL}/dashboard/worker`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al cargar el panel de trabajo')
  const data = await res.json()
  return mapWorkerDashboardModel(data)
}

export async function advanceJobStatus(jobId, newEstado, newProgreso) {
  const res = await fetch(`${API_BASE_URL}/trabajos/${jobId}/estado`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ estado: newEstado, progreso: newProgreso }),
  })
  if (!res.ok) throw new Error('Error al actualizar el estado del trabajo')
  return res.json()
}

export async function createJob(data) {
  const res = await fetch(`${API_BASE_URL}/trabajos`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al crear el trabajo')
  return res.json()
}

export async function getJobByCode(code) {
  const res = await fetch(
    `${API_BASE_URL}/trabajos/buscar?code=${encodeURIComponent(code.toUpperCase())}`,
    { headers: authHeaders() },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'OT no encontrada')
  }
  return res.json()
}

export const consumeMaterial = async (materialId, newQuantity) => {
  const res = await fetch(`${API_BASE_URL}/stock/${materialId}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ quantity: newQuantity }),
  })
  if (!res.ok) throw new Error('Error al actualizar el stock')
  return res.json()
}

export async function getOperarios() {
  const res = await fetch(`${API_BASE_URL}/auth/users`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener operarios')
  const users = await res.json()
  return users.filter((u) => u.role === 'operario')
}
