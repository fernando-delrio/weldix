import { API_BASE_URL } from '../../core/lib/api'

const TOKEN_KEY = 'weldix_access_token'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
  'Content-Type': 'application/json',
})

const authHeadersNoJson = () => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
})

// ── Tipos de ausencia ──────────────────────────────────────────────────────────

export const getTiposAusencia = async () => {
  const res = await fetch(`${API_BASE_URL}/rrhh/tipos-ausencia`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener tipos de ausencia')
  return res.json()
}

// ── Saldo de vacaciones ────────────────────────────────────────────────────────

export const getMiSaldo = async (year = new Date().getFullYear()) => {
  const res = await fetch(`${API_BASE_URL}/rrhh/saldo/mio?year=${year}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener saldo de vacaciones')
  return res.json()
}

// ── Solicitudes operario ───────────────────────────────────────────────────────

export const getMisSolicitudes = async () => {
  const res = await fetch(`${API_BASE_URL}/rrhh/solicitudes/mis-solicitudes`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al obtener solicitudes')
  return res.json()
}

export const crearSolicitud = async ({ tipo, fecha_inicio, fecha_fin, motivo }) => {
  const res = await fetch(`${API_BASE_URL}/rrhh/solicitudes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ tipo, fecha_inicio, fecha_fin, motivo: motivo || null }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al crear solicitud')
  }
  return res.json()
}

export const cancelarSolicitud = async (solicitudId) => {
  const res = await fetch(`${API_BASE_URL}/rrhh/solicitudes/${solicitudId}`, {
    method: 'DELETE',
    headers: authHeadersNoJson(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al cancelar solicitud')
  }
}

// ── Solicitudes admin ──────────────────────────────────────────────────────────

export const getTodasLasSolicitudes = async ({ estado, tipo, operario_id } = {}) => {
  const params = new URLSearchParams()
  if (estado) params.set('estado', estado)
  if (tipo) params.set('tipo', tipo)
  if (operario_id) params.set('operario_id', operario_id)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${API_BASE_URL}/rrhh/solicitudes${qs}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener solicitudes')
  return res.json()
}

export const revisarSolicitud = async (solicitudId, { estado, comentario_admin }) => {
  const res = await fetch(`${API_BASE_URL}/rrhh/solicitudes/${solicitudId}/revisar`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ estado, comentario_admin: comentario_admin || null }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al revisar solicitud')
  }
  return res.json()
}
