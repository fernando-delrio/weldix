import { getStatusConfig } from '../../core/lib/statusConfig'

// Convierte un array desconocido en array seguro (nunca falla con null/undefined)
const safeArray = (value) => (Array.isArray(value) ? value : [])

// Clampea un numero entre 0 y 100 (para porcentajes)
const clamp100 = (value) => Math.max(0, Math.min(value, 100))

const sanitizeMetric = (metric, index) => ({
  key: metric?.key || `metric-${index}`,
  label: metric?.label || 'Sin etiqueta',
  value: Number.isFinite(metric?.value) ? metric.value : 0,
  tone: metric?.tone || 'neutral',
})

const sanitizeTodayJob = (job, index) => ({
  id: job?.id || `job-${index}`,
  code: job?.code || null,
  title: job?.title || 'Trabajo sin titulo',
  area: job?.area || '',
  due: job?.due || '-',
  status: getStatusConfig(job?.status).label,
  tone: job?.tone || 'neutral',
  urgent: Boolean(job?.urgente),
  motivoRechazo: job?.motivo_rechazo ?? null,
})

const sanitizeStockItem = (item, index) => ({
  id: item?.id || `stock-${index}`,
  name: item?.name || 'Material sin nombre',
  quantity: Number.isFinite(item?.quantity) ? item.quantity : 0,
  unit: item?.unit || 'ud',
  stockLabel: item?.stock_label || '-',
  minimumLabel: item?.minimum_label || '-',
  level: clamp100(Number.isFinite(item?.level) ? item.level : 0),
  tone: item?.tone || 'neutral',
})

const mapGreeting = (raw) => ({
  greetingLabel: raw?.greeting?.greeting_label || 'Buenos días',
  operatorName: raw?.greeting?.operator_name || 'Operario',
  dateLabel: raw?.greeting?.date_label || '',
  shiftLabel: raw?.greeting?.shift_label || '',
})

const mapActiveJob = (activeJob) =>
  activeJob
    ? {
        id: activeJob.id || 0,
        code: activeJob.code || null,
        statusKey: activeJob.status || 'en_proceso',
        status: getStatusConfig(activeJob.status).label || 'En proceso',
        statusTone: activeJob.status_tone || 'info',
        dueLabel: activeJob.due_label || 'Sin fecha',
        dueTone: activeJob.due_tone || 'neutral',
        title: activeJob.title || 'Trabajo activo',
        client: activeJob.client || 'Cliente no definido',
        progress: clamp100(Number(activeJob.progress) || 0),
        stages: safeArray(activeJob.stages),
        currentStage: Number.isFinite(activeJob.current_stage) ? activeJob.current_stage : 0,
      }
    : null

// Transforma la respuesta cruda del backend en el modelo que usa el dashboard
export const mapWorkerDashboardModel = (raw) => ({
  greeting: mapGreeting(raw),
  metrics: safeArray(raw?.metrics).map(sanitizeMetric),
  activeJob: mapActiveJob(raw?.active_job),
  todayJobs: safeArray(raw?.today_jobs).map(sanitizeTodayJob),
  stock: safeArray(raw?.stock).map(sanitizeStockItem),
})
