import { API_BASE_URL } from '../../core/lib/api'

const TOKEN_KEY = 'weldix_access_token'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
})

// ── Admin: lista de operarios para el selector ────────────────────────────────

export const getOperarios = async () => {
  const res = await fetch(`${API_BASE_URL}/admin/operarios`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener operarios')
  return res.json()
}

// ── Admin ──────────────────────────────────────────────────────────────────────

export const uploadNomina = async ({ operarioId, year, month, file }) => {
  const form = new FormData()
  form.append('operario_id', operarioId)
  form.append('year', year)
  form.append('month', month)
  form.append('file', file)

  const res = await fetch(`${API_BASE_URL}/nominas/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al subir la nómina')
  }
  return res.json()
}

export const getNominas = async ({ operarioId, year } = {}) => {
  const params = new URLSearchParams()
  if (operarioId) params.set('operario_id', operarioId)
  if (year) params.set('year', year)
  const res = await fetch(`${API_BASE_URL}/nominas?${params}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener nóminas')
  return res.json()
}

export const deleteNomina = async (nominaId) => {
  const res = await fetch(`${API_BASE_URL}/nominas/${nominaId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al eliminar la nómina')
}

export const reanalizarNomina = async (nominaId) => {
  const res = await fetch(`${API_BASE_URL}/nominas/${nominaId}/analizar`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al re-analizar la nómina')
  return res.json()
}

// ── Operario ───────────────────────────────────────────────────────────────────

export const getMisNominas = async (year) => {
  const params = year ? `?year=${year}` : ''
  const res = await fetch(`${API_BASE_URL}/nominas/mias${params}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener tus nóminas')
  return res.json()
}

// ── Descarga (abre el PDF en nueva pestaña) ────────────────────────────────────

export const descargarNomina = async (nominaId, filename) => {
  const res = await fetch(`${API_BASE_URL}/nominas/${nominaId}/descargar`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al descargar la nómina')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
