import { useCallback, useEffect, useMemo, useState } from 'react'

import { getStatusConfig } from '../../core/lib/statusConfig'
import { advanceJobStatus, getWorkerDashboard } from '../services/workerDashboardService'

// Suma delta al valor de una metrica concreta dentro del array de metricas
const updateMetric = (metrics, metricKey, delta) =>
  metrics.map((metric) =>
    metric.key === metricKey ? { ...metric, value: Math.max(0, metric.value + delta) } : metric,
  )

const hasActiveJob = (dashboard) => Boolean(dashboard?.activeJob)

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

  const markActiveJobCompleted = useCallback(async () => {
    if (!hasActiveJob(dashboard)) return
    const { id, status } = dashboard.activeJob
    const { next, nextProgress } = getStatusConfig(status)
    if (!next) return
    try {
      await advanceJobStatus(id, next, nextProgress)
      await refresh()
    } catch {
      // no-op: el error no bloquea la UI, el usuario puede reintentar
    }
  }, [dashboard, refresh])

  const registerMaterialUsage = useCallback(() => {
    setDashboard((prev) =>
      hasActiveJob(prev)
        ? {
            ...prev,
            activeJob: {
              ...prev.activeJob,
              progress: Math.min(100, prev.activeJob.progress + 8),
            },
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
