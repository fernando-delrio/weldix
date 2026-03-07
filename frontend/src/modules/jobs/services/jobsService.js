import { API_BASE_URL } from '../../core/lib/api'
import { mapJobsModel } from '../lib/jobsModel'

const TOKEN_KEY = 'weldix_access_token'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
})

export async function getJobs() {
  const res = await fetch(`${API_BASE_URL}/trabajos`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener los trabajos')
  const data = await res.json()
  return mapJobsModel(data)
}
