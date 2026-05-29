import { API_BASE_URL } from '../../core/lib/api'
import { mapJobsModel } from '../lib/jobsModel'

const TOKEN_KEY = 'weldix_access_token'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
})

const jsonHeaders = () => ({
  ...authHeaders(),
  'Content-Type': 'application/json',
})

export const getJobs = async () => {
  const res = await fetch(`${API_BASE_URL}/trabajos`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener los trabajos')
  const data = await res.json()
  return mapJobsModel(data)
}

export const getJobById = async (id) => {
  const res = await fetch(`${API_BASE_URL}/trabajos/${id}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudo cargar el trabajo')
  return res.json()
}

export const advanceJobStatus = async (id, estado, progreso) => {
  const res = await fetch(`${API_BASE_URL}/trabajos/${id}/estado`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ estado, progreso }),
  })
  if (!res.ok) throw new Error('No se pudo actualizar el estado del trabajo')
  return res.json()
}

export const getJobHistory = async (id) => {
  const res = await fetch(`${API_BASE_URL}/trabajos/${id}/historial`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudo cargar el historial')
  return res.json()
}

export const downloadJobPdf = async (id) => {
  const res = await fetch(`${API_BASE_URL}/trabajos/${id}/pdf`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudo generar el PDF')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `parte-trabajo-${id}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export const searchJobs = async (q) => {
  const res = await fetch(`${API_BASE_URL}/trabajos/buscar-rapido?q=${encodeURIComponent(q)}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al buscar trabajos')
  return res.json()
}
