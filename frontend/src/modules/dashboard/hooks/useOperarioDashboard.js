import { useCallback, useEffect, useMemo, useState } from 'react'

import { getOperarioDashboard } from '../services/operarioDashboardService'

function updateMetric(metrics, metricKey, delta) {
  return metrics.map((metric) =>
    metric.key === metricKey ? { ...metric, value: Math.max(0, metric.value + delta) } : metric,
  )
}

export function useOperarioDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await getOperarioDashboard()
      setDashboard(data)
    } catch {
      setError('No se pudo cargar el panel. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const markActiveJobCompleted = useCallback(() => {
    setDashboard((previous) => {
      if (!previous?.activeJob) return previous

      const nextMetrics = updateMetric(
        updateMetric(previous.metrics, 'pending', -1),
        'in_progress',
        -1,
      )

      return {
        ...previous,
        metrics: nextMetrics,
        activeJob: {
          ...previous.activeJob,
          status: 'Completado',
          statusTone: 'success',
          dueLabel: 'Entregado',
          dueTone: 'success',
          progress: 100,
          currentStage: previous.activeJob.stages.length - 1,
        },
      }
    })
  }, [])

  const registerMaterialUsage = useCallback(() => {
    setDashboard((previous) => {
      if (!previous?.activeJob) return previous

      const nextProgress = Math.min(100, previous.activeJob.progress + 8)
      const isCompleted = nextProgress >= 100

      return {
        ...previous,
        activeJob: {
          ...previous.activeJob,
          progress: nextProgress,
          currentStage: isCompleted
            ? previous.activeJob.stages.length - 1
            : previous.activeJob.currentStage,
          status: isCompleted ? 'Completado' : previous.activeJob.status,
          statusTone: isCompleted ? 'success' : previous.activeJob.statusTone,
          dueLabel: isCompleted ? 'Entregado' : previous.activeJob.dueLabel,
          dueTone: isCompleted ? 'success' : previous.activeJob.dueTone,
        },
        stock: previous.stock.map((item, index) =>
          index === 0 ? { ...item, level: Math.max(0, item.level - 6) } : item,
        ),
      }
    })
  }, [])

  const isEmpty = useMemo(() => !dashboard, [dashboard])

  return {
    dashboard,
    isLoading,
    isEmpty,
    error,
    refresh,
    markActiveJobCompleted,
    registerMaterialUsage,
  }
}
