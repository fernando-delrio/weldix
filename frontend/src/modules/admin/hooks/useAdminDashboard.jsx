import { useCallback, useEffect, useState } from 'react'

import { mapAdminDashboard } from '../lib/adminModel'
import {
  assignJob    as apiAssignJob,
  createUser   as apiCreateUser,
  deleteJob    as apiDeleteJob,
  getAdminDashboard,
} from '../services/adminService'


export const useAdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState('')

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setDashboard(mapAdminDashboard(await getAdminDashboard()))
    } catch {
      setError('No se pudo cargar el panel de administración.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const assignJob = useCallback(async (jobId, operarioId) => {
    try {
      await apiAssignJob(jobId, operarioId)
      await refresh()
    } catch { /* no-op: el usuario puede reintentar */ }
  }, [refresh])

  const removeJob = useCallback(async (jobId) => {
    try {
      await apiDeleteJob(jobId)
      await refresh()
    } catch { /* no-op */ }
  }, [refresh])

  const createUser = useCallback(async (data) => {
    await apiCreateUser(data)
    await refresh()
  }, [refresh])

  return { dashboard, isLoading, error, refresh, assignJob, removeJob, createUser }
}
