import { getStatusConfig } from '../../core/lib/statusConfig'

// Convierte un array desconocido en array seguro (nunca falla con null/undefined)
const safeArray = (value) => Array.isArray(value) ? value : []

// Formatea la fecha de entrega del backend (YYYY-MM-DD) al label que muestra el card
const formatDue = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `Entrega: ${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
}

// Formatea una fecha/datetime completo para la vista de detalle
const formatFullDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Normaliza un trabajo crudo del backend con valores por defecto seguros.
// statusKey: key raw del backend (para lógica de filtrado)
// status:    label legible (para mostrar en UI)
export const sanitizeJob = (job, index) => ({
  id:        job?.id        || `job-${index}`,
  code:      job?.code      || null,
  title:     job?.titulo    || 'Trabajo sin titulo',
  client:    job?.cliente   || 'Cliente no definido',
  type:      job?.descripcion || '',
  due:       formatDue(job?.fecha_inicio),
  statusKey: job?.estado    || 'pendiente',
  status:    getStatusConfig(job?.estado).label,
  tone:      job?.tone      || 'neutral',
  progress:  Math.max(0, Math.min(Number(job?.progreso) || 0, 100)),
})

// Modelo extendido para la página de detalle — incluye campos no necesarios en el listado
export const sanitizeJobDetail = (job) => ({
  ...sanitizeJob(job, 0),
  dueDate:    formatFullDate(job?.fecha_inicio),
  createdAt:  formatFullDate(job?.created_at),
  description: job?.descripcion ?? null,
  operarioId:  job?.operario_id ?? null,
})

// Transforma la lista cruda del backend en el modelo que usan los componentes
export const mapJobsModel = (rawList) => safeArray(rawList).map(sanitizeJob)
