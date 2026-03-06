// Convierte un array desconocido en array seguro (nunca falla con null/undefined)
const safeArray = (value) => Array.isArray(value) ? value : []

// Normaliza un trabajo crudo del backend con valores por defecto seguros
export function sanitizeJob(job, index) {
  return {
    id:       job?.id       || `job-${index}`,
    title:    job?.title    || 'Trabajo sin titulo',
    client:   job?.client   || 'Cliente no definido',
    type:     job?.type     || 'General',
    area:     job?.area     || 'Area no definida',
    due:      job?.due      || '-',
    status:   job?.status   || 'Pendiente',
    tone:     job?.tone     || 'neutral',
    progress: Math.max(0, Math.min(Number(job?.progress) || 0, 100)),
  }
}

// Transforma la lista cruda del backend en el modelo que usan los componentes
export const mapJobsModel = (rawList) => safeArray(rawList).map(sanitizeJob)
