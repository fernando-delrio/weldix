function sanitizeMetric(metric, fallbackKey) {
  return {
    key: metric?.key || fallbackKey,
    label: metric?.label || 'Sin etiqueta',
    value: Number.isFinite(metric?.value) ? metric.value : 0,
    tone: metric?.tone || 'neutral',
  }
}

function sanitizeTodayJob(job, index) {
  return {
    id: job?.id || `job-${index}`,
    title: job?.title || 'Trabajo sin titulo',
    area: job?.area || 'Area no definida',
    due: job?.due || '-',
    status: job?.status || 'Pendiente',
    tone: job?.tone || 'neutral',
  }
}

function sanitizeStockItem(item, index) {
  const level = Number.isFinite(item?.level) ? item.level : 0
  return {
    id: item?.id || `stock-${index}`,
    name: item?.name || 'Material sin nombre',
    stockLabel: item?.stockLabel || '-',
    minimumLabel: item?.minimumLabel || '-',
    level: Math.max(0, Math.min(level, 100)),
    tone: item?.tone || 'neutral',
  }
}

export function mapOperarioDashboardModel(raw) {
  const activeJob = raw?.activeJob

  return {
    greeting: {
      greetingLabel: raw?.greeting?.greetingLabel || 'Buenos dias',
      operatorName: raw?.greeting?.operatorName || 'Operario',
      dateLabel: raw?.greeting?.dateLabel || '',
      shiftLabel: raw?.greeting?.shiftLabel || '',
    },
    metrics: Array.isArray(raw?.metrics)
      ? raw.metrics.map((metric, index) => sanitizeMetric(metric, `metric-${index}`))
      : [],
    activeJob: activeJob
      ? {
          id: activeJob.id || 'ORD-0000-000',
          status: activeJob.status || 'En proceso',
          statusTone: activeJob.statusTone || 'info',
          dueLabel: activeJob.dueLabel || 'Sin fecha',
          dueTone: activeJob.dueTone || 'neutral',
          title: activeJob.title || 'Trabajo activo',
          client: activeJob.client || 'Cliente no definido',
          progress: Math.max(0, Math.min(Number(activeJob.progress) || 0, 100)),
          stages: Array.isArray(activeJob.stages) ? activeJob.stages : [],
          currentStage: Number.isFinite(activeJob.currentStage) ? activeJob.currentStage : 0,
        }
      : null,
    todayJobs: Array.isArray(raw?.todayJobs)
      ? raw.todayJobs.map((job, index) => sanitizeTodayJob(job, index))
      : [],
    stock: Array.isArray(raw?.stock) ? raw.stock.map((item, index) => sanitizeStockItem(item, index)) : [],
  }
}
