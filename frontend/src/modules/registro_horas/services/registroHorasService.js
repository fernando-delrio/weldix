import { API_BASE_URL } from '../../core/lib/api'

const TOKEN_KEY = 'weldix_access_token'
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` })
const jsonHeaders = () => ({ ...authHeaders(), 'Content-Type': 'application/json' })

export const getRegistroActivo = async () => {
  const res = await fetch(`${API_BASE_URL}/registro-horas/activo`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener el registro activo')
  return res.json()
}

export const iniciarRegistro = async (jobId) => {
  const res = await fetch(`${API_BASE_URL}/registro-horas/iniciar`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ job_id: jobId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al iniciar registro')
  }
  return res.json()
}

export const finalizarRegistro = async (registroId) => {
  const res = await fetch(`${API_BASE_URL}/registro-horas/${registroId}/finalizar`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al finalizar registro')
  }
  return res.json()
}

export const getHorasOT = async (jobId) => {
  const res = await fetch(`${API_BASE_URL}/trabajos/${jobId}/horas`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener horas de la OT')
  return res.json()
}
