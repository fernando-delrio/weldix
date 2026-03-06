// Convierte un array desconocido en array seguro (nunca falla con null/undefined)
const safeArray = (value) => Array.isArray(value) ? value : []

// Clampea un numero entre 0 y 100 (para porcentajes)
const clamp100 = (value) => Math.max(0, Math.min(value, 100))

function sanitizeMetric(metric, index) {
  return {
    key:   metric?.key   || `metric-${index}`,
    label: metric?.label || 'Sin etiqueta',
    value: Number.isFinite(metric?.value) ? metric.value : 0,
    tone:  metric?.tone  || 'neutral',
  }
}

function sanitizeTodayJob(job, index) {
  return {
    id:     job?.id     || `job-${index}`,
    title:  job?.title  || 'Trabajo sin titulo',
    area:   job?.area   || 'Area no definida',
    due:    job?.due    || '-',
    status: job?.status || 'Pendiente',
    tone:   job?.tone   || 'neutral',
  }
}

function sanitizeStockItem(item, index) {
  return {
    id:           item?.id           || `stock-${index}`,
    name:         item?.name         || 'Material sin nombre',
    stockLabel:   item?.stockLabel   || '-',
    minimumLabel: item?.minimumLabel || '-',
    level:        clamp100(Number.isFinite(item?.level) ? item.level : 0),
    tone:         item?.tone         || 'neutral',
  }
}

const mapGreeting = (raw) => ({
  greetingLabel: raw?.greeting?.greetingLabel || 'Buenos dias',
  operatorName:  raw?.greeting?.operatorName  || 'Operario',
  dateLabel:     raw?.greeting?.dateLabel     || '',
  shiftLabel:    raw?.greeting?.shiftLabel    || '',
})

const mapActiveJob = (activeJob) =>
  activeJob
    ? {
        id:           activeJob.id           || 'ORD-0000-000',
        status:       activeJob.status       || 'En proceso',
        statusTone:   activeJob.statusTone   || 'info',
        dueLabel:     activeJob.dueLabel     || 'Sin fecha',
        dueTone:      activeJob.dueTone      || 'neutral',
        title:        activeJob.title        || 'Trabajo activo',
        client:       activeJob.client       || 'Cliente no definido',
        progress:     clamp100(Number(activeJob.progress) || 0),
        stages:       safeArray(activeJob.stages),
        currentStage: Number.isFinite(activeJob.currentStage) ? activeJob.currentStage : 0,
      }
    : null

// Transforma la respuesta cruda del backend en el modelo que usa el dashboard
export function mapWorkerDashboardModel(raw) {
  return {
    greeting:  mapGreeting(raw),
    metrics:   safeArray(raw?.metrics).map(sanitizeMetric),
    activeJob: mapActiveJob(raw?.activeJob),
    todayJobs: safeArray(raw?.todayJobs).map(sanitizeTodayJob),
    stock:     safeArray(raw?.stock).map(sanitizeStockItem),
  }
}
