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

// Modo Kiosko: obtiene (o genera) el enlace de la tablet compartida del taller.
export const getKioskLink = async () => {
  const res = await fetch(`${API_BASE_URL}/kiosko/generar-link`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('No se pudo generar el enlace del kiosko')
  return res.json()
}

export const getResumenExtras = async ({ desde, hasta } = {}) => {
  const params = new URLSearchParams()
  if (desde) params.set('desde', desde)
  if (hasta) params.set('hasta', hasta)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${API_BASE_URL}/fichajes/admin/resumen-extras${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al obtener resumen de extras')
  return res.json()
}

export const getBalanceHoras = async ({ desde, hasta } = {}) => {
  const params = new URLSearchParams()
  if (desde) params.set('desde', desde)
  if (hasta) params.set('hasta', hasta)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${API_BASE_URL}/fichajes/admin/balance-horas${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al obtener el balance de horas')
  return res.json()
}

export const descargarFichajesCsvRango = async ({ desde, hasta } = {}) => {
  const params = new URLSearchParams()
  if (desde) params.set('desde', desde)
  if (hasta) params.set('hasta', hasta)
  const qs = params.toString() ? `?${params.toString()}` : ''

  const res = await fetch(`${API_BASE_URL}/fichajes/export/csv-rango${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al exportar CSV de fichajes')
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const desdeStr = desde ?? 'inicio'
  const hastaStr = hasta ?? 'hoy'
  const a = document.createElement('a')
  a.href = url
  a.download = `fichajes-${desdeStr}-a-${hastaStr}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
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
