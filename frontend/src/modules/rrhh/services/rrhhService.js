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

// ══════════════════════════════════════════════════════════════════════════════
// RRHH-1 — EPIs
// ══════════════════════════════════════════════════════════════════════════════

export const getTiposEpi = async () => {
  const res = await fetch(`${API_BASE_URL}/rrhh/tipos-epi`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener tipos de EPI')
  return res.json()
}

export const getEpis = async ({ operario_id } = {}) => {
  const params = new URLSearchParams()
  if (operario_id) params.set('operario_id', operario_id)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${API_BASE_URL}/rrhh/epis${qs}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener EPIs')
  return res.json()
}

export const getEpisProximosCaducar = async (dias = 30) => {
  const res = await fetch(`${API_BASE_URL}/rrhh/epis/proximos-caducar?dias=${dias}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al obtener EPIs próximos a caducar')
  return res.json()
}

export const crearEpi = async (data) => {
  const res = await fetch(`${API_BASE_URL}/rrhh/epis`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al registrar EPI')
  }
  return res.json()
}

export const eliminarEpi = async (epiId) => {
  const res = await fetch(`${API_BASE_URL}/rrhh/epis/${epiId}`, {
    method: 'DELETE',
    headers: authHeadersNoJson(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al eliminar EPI')
  }
}

export const actualizarEstadoEpi = async (epiId, estado) => {
  const res = await fetch(`${API_BASE_URL}/rrhh/epis/${epiId}/estado?estado=${estado}`, {
    method: 'PATCH',
    headers: authHeadersNoJson(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al actualizar EPI')
  }
  return res.json()
}

// ── Certificados ───────────────────────────────────────────────────────────────

export const getTiposCertificado = async () => {
  const res = await fetch(`${API_BASE_URL}/rrhh/tipos-certificado`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener tipos de certificado')
  return res.json()
}

export const getCertificados = async ({ operario_id } = {}) => {
  const params = new URLSearchParams()
  if (operario_id) params.set('operario_id', operario_id)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${API_BASE_URL}/rrhh/certificados${qs}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener certificados')
  return res.json()
}

export const crearCertificado = async (data, archivo = null) => {
  const fd = new FormData()
  fd.append('operario_id', data.operario_id)
  fd.append('tipo', data.tipo)
  fd.append('fecha_emision', data.fecha_emision)
  if (data.fecha_caducidad) fd.append('fecha_caducidad', data.fecha_caducidad)
  if (data.descripcion) fd.append('descripcion', data.descripcion)
  if (data.entidad_certificadora) fd.append('entidad_certificadora', data.entidad_certificadora)
  if (archivo) fd.append('archivo', archivo)
  const res = await fetch(`${API_BASE_URL}/rrhh/certificados`, {
    method: 'POST',
    headers: authHeadersNoJson(),
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al crear certificado')
  }
  return res.json()
}

// ── Reconocimientos médicos ────────────────────────────────────────────────────

export const getReconocimientos = async ({ operario_id } = {}) => {
  const params = new URLSearchParams()
  if (operario_id) params.set('operario_id', operario_id)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${API_BASE_URL}/rrhh/reconocimientos${qs}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener reconocimientos médicos')
  return res.json()
}

export const crearReconocimiento = async (data, archivo = null) => {
  const fd = new FormData()
  fd.append('operario_id', data.operario_id)
  fd.append('fecha_realizado', data.fecha_realizado)
  fd.append('resultado', data.resultado)
  if (data.fecha_proximo) fd.append('fecha_proximo', data.fecha_proximo)
  if (data.restricciones) fd.append('restricciones', data.restricciones)
  if (data.observaciones) fd.append('observaciones', data.observaciones)
  if (archivo) fd.append('archivo', archivo)
  const res = await fetch(`${API_BASE_URL}/rrhh/reconocimientos`, {
    method: 'POST',
    headers: authHeadersNoJson(),
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al registrar reconocimiento')
  }
  return res.json()
}

// ── Resumen horas ──────────────────────────────────────────────────────────────

export const getResumenHoras = async (operarioId, mes = null) => {
  const params = new URLSearchParams()
  if (mes) params.set('mes', mes)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${API_BASE_URL}/rrhh/horas-extra/${operarioId}${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al obtener resumen de horas')
  return res.json()
}

// ══════════════════════════════════════════════════════════════════════════════
// RRHH-2 — Turnos
// ══════════════════════════════════════════════════════════════════════════════

export const getTurnos = async ({ fecha_inicio, fecha_fin } = {}) => {
  const params = new URLSearchParams()
  if (fecha_inicio) params.set('fecha_inicio', fecha_inicio)
  if (fecha_fin) params.set('fecha_fin', fecha_fin)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${API_BASE_URL}/rrhh/turnos${qs}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener turnos')
  return res.json()
}

export const crearTurnosBulk = async (turnos) => {
  const res = await fetch(`${API_BASE_URL}/rrhh/turnos/bulk`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ turnos }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al guardar turnos')
  }
  return res.json()
}

export const eliminarTurno = async (turnoId) => {
  const res = await fetch(`${API_BASE_URL}/rrhh/turnos/${turnoId}`, {
    method: 'DELETE',
    headers: authHeadersNoJson(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al eliminar turno')
  }
}

export const getCambiosTurno = async () => {
  const res = await fetch(`${API_BASE_URL}/rrhh/turnos/cambios`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener cambios de turno')
  return res.json()
}

export const solicitarCambioTurno = async (data) => {
  const res = await fetch(`${API_BASE_URL}/rrhh/turnos/solicitar-cambio`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al solicitar cambio de turno')
  }
  return res.json()
}

export const revisarCambioTurno = async (solicitudId, { estado, comentario_admin }) => {
  const res = await fetch(`${API_BASE_URL}/rrhh/turnos/cambios/${solicitudId}/revisar`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ estado, comentario_admin: comentario_admin || null }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al revisar cambio de turno')
  }
  return res.json()
}

// ══════════════════════════════════════════════════════════════════════════════
// RRHH-3 — Siniestralidad
// ══════════════════════════════════════════════════════════════════════════════

export const getAccidentes = async () => {
  const res = await fetch(`${API_BASE_URL}/rrhh/accidentes`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener accidentes')
  return res.json()
}

export const getMisAccidentes = async () => {
  const res = await fetch(`${API_BASE_URL}/rrhh/accidentes/mios`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener tus incidentes')
  return res.json()
}

export const crearAccidente = async (data) => {
  const res = await fetch(`${API_BASE_URL}/rrhh/accidentes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al registrar accidente')
  }
  return res.json()
}

export const actualizarAccidente = async (accidenteId, data) => {
  const res = await fetch(`${API_BASE_URL}/rrhh/accidentes/${accidenteId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al actualizar accidente')
  }
  return res.json()
}

export const getIndicesSiniestralidad = async (year = new Date().getFullYear()) => {
  const res = await fetch(`${API_BASE_URL}/rrhh/accidentes/indices?year=${year}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al obtener índices de siniestralidad')
  return res.json()
}

export const getPermisosEspeciales = async ({ operario_id } = {}) => {
  const params = new URLSearchParams()
  if (operario_id) params.set('operario_id', operario_id)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${API_BASE_URL}/rrhh/permisos-especiales${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al obtener permisos especiales')
  return res.json()
}

export const crearPermisoEspecial = async (data, archivo = null) => {
  const fd = new FormData()
  fd.append('operario_id', data.operario_id)
  fd.append('tipo', data.tipo)
  fd.append('fecha_emision', data.fecha_emision)
  if (data.fecha_caducidad) fd.append('fecha_caducidad', data.fecha_caducidad)
  if (data.descripcion_trabajo) fd.append('descripcion_trabajo', data.descripcion_trabajo)
  if (archivo) fd.append('archivo', archivo)
  const res = await fetch(`${API_BASE_URL}/rrhh/permisos-especiales`, {
    method: 'POST',
    headers: authHeadersNoJson(),
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al crear permiso especial')
  }
  return res.json()
}
