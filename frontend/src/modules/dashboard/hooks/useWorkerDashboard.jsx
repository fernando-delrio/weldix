import { useCallback, useEffect, useMemo, useState } from 'react'

import { getStatusConfig } from '../../core/lib/statusConfig'
import {
  advanceJobStatus,
  consumeMaterial,
  getWorkerDashboard,
} from '../services/workerDashboardService'

const hasActiveJob = (dashboard) => Boolean(dashboard?.activeJob)
const canAdvanceJob = (dashboard) =>
  hasActiveJob(dashboard) && Boolean(getStatusConfig(dashboard.activeJob.statusKey).next)

const executeAdvance = async ({ id, statusKey }, refresh) => {
  const { next, nextProgress } = getStatusConfig(statusKey)
  await advanceJobStatus(id, next, nextProgress)
  await refresh()
}

// El servidor valida el stock disponible — solo enviamos la cantidad consumida
const executeMaterialUsage = async (materialId, consumed, refresh) => {
  await consumeMaterial(materialId, consumed)
  await refresh()
}

export const useWorkerDashboard = () => {
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setDashboard(await getWorkerDashboard())
    } catch {
      setError('No se pudo cargar el panel. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const markActiveJobCompleted = useCallback(async () => {
    const canAdvance = canAdvanceJob(dashboard)
    return canAdvance && executeAdvance(dashboard.activeJob, refresh)
  }, [dashboard, refresh])

  const startPendingJob = useCallback(
    async (jobId) => {
      const { next, nextProgress } = getStatusConfig('pendiente')
      try {
        await advanceJobStatus(jobId, next, nextProgress)
        await refresh()
      } catch {
        /* no-op */
      }
    },
    [refresh]
  )

  const registerMaterialUsage = useCallback(
    async (materialId, consumed) => {
      return executeMaterialUsage(materialId, consumed, refresh)
    },
    [refresh]
  )

  const isEmpty = useMemo(() => !dashboard, [dashboard])

  return {
    dashboard,
    isLoading,
    isEmpty,
    error,
    refresh,
    markActiveJobCompleted,
    startPendingJob,
    registerMaterialUsage,
  }
}
