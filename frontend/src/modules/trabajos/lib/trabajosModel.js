export function sanitizeJob(job, index) {
  return {
    id: job?.id || `job-${index}`,
    title: job?.title || 'Trabajo sin titulo',
    client: job?.client || 'Cliente no definido',
    type: job?.type || 'General',
    area: job?.area || 'Area no definida',
    due: job?.due || '-',
    status: job?.status || 'Pendiente',
    tone: job?.tone || 'neutral',
    progress: Math.max(0, Math.min(Number(job?.progress) || 0, 100)),
  }
}

export function mapTrabajosModel(rawList) {
  if (!Array.isArray(rawList)) return []
  return rawList.map((job, index) => sanitizeJob(job, index))
}
