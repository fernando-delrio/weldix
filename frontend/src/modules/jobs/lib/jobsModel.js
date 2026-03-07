// Convierte un array desconocido en array seguro (nunca falla con null/undefined)
const safeArray = (value) => Array.isArray(value) ? value : []

// Formatea la fecha de entrega del backend (YYYY-MM-DD) al label que muestra el card
const formatDue = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `Entrega: ${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
}

// Normaliza un trabajo crudo del backend con valores por defecto seguros
// El backend devuelve nombres en español: titulo, cliente, estado, progreso, fecha_inicio
export function sanitizeJob(job, index) {
  return {
    id:       job?.id       || `job-${index}`,
    title:    job?.titulo   || 'Trabajo sin titulo',
    client:   job?.cliente  || 'Cliente no definido',
    type:     job?.type     || '',
    due:      formatDue(job?.fecha_inicio),
    status:   job?.estado   || 'pendiente',
    tone:     job?.tone     || 'neutral',
    progress: Math.max(0, Math.min(Number(job?.progreso) || 0, 100)),
  }
}

// Transforma la lista cruda del backend en el modelo que usan los componentes
export const mapJobsModel = (rawList) => safeArray(rawList).map(sanitizeJob)
