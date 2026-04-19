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

export const forzarCierreJornada = async (fichajeId, horasReales) => {
  const res = await fetch(`${API_BASE_URL}/fichajes/${fichajeId}/forzar-cierre`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ horas_reales: horasReales }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al forzar cierre de jornada')
  }
  return res.json()
}

export const descargarFichajesCsv = async ({ year, month }) => {
  const params = new URLSearchParams()
  if (year) params.set('year', String(year))
  if (month) params.set('month', String(month))
  const qs = params.toString() ? `?${params.toString()}` : ''

  const res = await fetch(`${API_BASE_URL}/fichajes/export/csv${qs}`, { headers: authHeaders() })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al exportar CSV de fichajes')
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const filename = `fichajes-${year ?? 'all'}-${String(month ?? 'all').padStart(2, '0')}.csv`
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
