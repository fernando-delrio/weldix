import { useCallback, useEffect, useMemo, useState } from 'react'

import { getStatusConfig } from '../../core/lib/statusConfig'
import { advanceJobStatus, consumeMaterial, getWorkerDashboard } from '../services/workerDashboardService'


const hasActiveJob  = (dashboard) => Boolean(dashboard?.activeJob)
const canAdvanceJob = (dashboard) => hasActiveJob(dashboard) && Boolean(getStatusConfig(dashboard.activeJob.status).next)
const findStockItem = (stock, id) => stock?.find((s) => s.id === id)
const decreasedQty  = (item, consumed) => Math.max(0, item.quantity - consumed)

const executeAdvance = async ({ id, status }, refresh) => {
  const { next, nextProgress } = getStatusConfig(status)
  await advanceJobStatus(id, next, nextProgress)
  await refresh()
}

const executeMaterialUsage = async (item, materialId, consumed, refresh) => {
  await consumeMaterial(materialId, decreasedQty(item, consumed))
  await refresh()
}

export const useWorkerDashboard = () => {
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState('')

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

  useEffect(() => { refresh() }, [refresh])

  const markActiveJobCompleted = useCallback(async () => {
    const canAdvance = canAdvanceJob(dashboard)
    return canAdvance && executeAdvance(dashboard.activeJob, refresh)
  }, [dashboard, refresh])

  const startPendingJob = useCallback(async (jobId) => {
    const { next, nextProgress } = getStatusConfig('pendiente')
    try {
      await advanceJobStatus(jobId, next, nextProgress)
      await refresh()
    } catch { /* no-op */ }
  }, [refresh])

  const registerMaterialUsage = useCallback(async (materialId, consumed) => {
    const item = findStockItem(dashboard?.stock, materialId)
    return item && executeMaterialUsage(item, materialId, consumed, refresh)
  }, [dashboard, refresh])

  const isEmpty = useMemo(() => !dashboard, [dashboard])

  return { dashboard, isLoading, isEmpty, error, refresh, markActiveJobCompleted, startPendingJob, registerMaterialUsage }
}
