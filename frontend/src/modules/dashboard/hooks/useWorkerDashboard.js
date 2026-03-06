import { useCallback, useEffect, useMemo, useState } from 'react'

import { getWorkerDashboard } from '../services/workerDashboardService'

// Suma delta al valor de una metrica concreta dentro del array de metricas
const updateMetric = (metrics, metricKey, delta) =>
  metrics.map((metric) =>
    metric.key === metricKey ? { ...metric, value: Math.max(0, metric.value + delta) } : metric,
  )

const hasActiveJob = (dashboard) => Boolean(dashboard?.activeJob)

// Construye el estado del job activo al completarlo
const buildCompletedJob = (activeJob) => ({
  ...activeJob,
  status:       'Completado',
  statusTone:   'success',
  dueLabel:     'Entregado',
  dueTone:      'success',
  progress:     100,
  currentStage: activeJob.stages.length - 1,
})

// Construye el estado del job activo al registrar uso de material (+8% progreso)
const buildJobAfterMaterialUsage = (activeJob) => {
  const nextProgress = Math.min(100, activeJob.progress + 8)
  const isCompleted  = nextProgress >= 100

  return {
    ...activeJob,
    progress:     nextProgress,
    currentStage: isCompleted ? activeJob.stages.length - 1 : activeJob.currentStage,
    status:       isCompleted ? 'Completado'                : activeJob.status,
    statusTone:   isCompleted ? 'success'                   : activeJob.statusTone,
    dueLabel:     isCompleted ? 'Entregado'                 : activeJob.dueLabel,
    dueTone:      isCompleted ? 'success'                   : activeJob.dueTone,
  }
}

export function useWorkerDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getWorkerDashboard()
      setDashboard(data)
    } catch {
      setError('No se pudo cargar el panel. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const markActiveJobCompleted = useCallback(() => {
    setDashboard((prev) =>
      hasActiveJob(prev)
        ? {
            ...prev,
            metrics:   updateMetric(updateMetric(prev.metrics, 'pending', -1), 'in_progress', -1),
            activeJob: buildCompletedJob(prev.activeJob),
          }
        : prev,
    )
  }, [])

  const registerMaterialUsage = useCallback(() => {
    setDashboard((prev) =>
      hasActiveJob(prev)
        ? {
            ...prev,
            activeJob: buildJobAfterMaterialUsage(prev.activeJob),
            stock: prev.stock.map((item, index) =>
              index === 0 ? { ...item, level: Math.max(0, item.level - 6) } : item,
            ),
          }
        : prev,
    )
  }, [])

  const isEmpty = useMemo(() => !dashboard, [dashboard])

  return { dashboard, isLoading, isEmpty, error, refresh, markActiveJobCompleted, registerMaterialUsage }
}
