import { useCallback, useEffect, useState } from 'react'

import { mapAdminDashboard } from '../lib/adminModel'
import {
  assignJob as apiAssignJob,
  changeJobStatus as apiChangeJobStatus,
  createUser as apiCreateUser,
  deleteJob as apiDeleteJob,
  getAdminDashboard,
  regenerateUserPin as apiRegenerateUserPin,
  rejectJob as apiRejectJob,
  resetUserPassword as apiResetUserPassword,
} from '../services/adminService'

export const useAdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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

  useEffect(() => {
    refresh()
  }, [refresh])

  const assignJob = useCallback(
    async (jobId, operarioId) => {
      try {
        await apiAssignJob(jobId, operarioId)
        await refresh()
      } catch {
        /* no-op: el usuario puede reintentar */
      }
    },
    [refresh]
  )

  const removeJob = useCallback(
    async (jobId) => {
      try {
        await apiDeleteJob(jobId)
        await refresh()
      } catch {
        /* no-op */
      }
    },
    [refresh]
  )

  const changeJobStatus = useCallback(
    async (jobId, estado) => {
      await apiChangeJobStatus(jobId, estado)
      await refresh()
    },
    [refresh]
  )

  const rejectJob = useCallback(
    async (jobId, motivo) => {
      await apiRejectJob(jobId, motivo)
      await refresh()
    },
    [refresh]
  )

  const createUser = useCallback(
    async (data) => {
      await apiCreateUser(data)
      await refresh()
    },
    [refresh]
  )

  // El service lanza; el hook captura y devuelve un resultado que el componente
  // consume sin try/catch (regla del proyecto: try/catch solo en el hook).
  const resetUserPassword = useCallback(async (userId, newPassword) => {
    try {
      await apiResetUserPassword(userId, newPassword)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }, [])

  const regenerateUserPin = useCallback(async (userId) => {
    try {
      const { pin } = await apiRegenerateUserPin(userId)
      return { ok: true, pin }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }, [])

  return {
    dashboard,
    isLoading,
    error,
    refresh,
    assignJob,
    removeJob,
    createUser,
    changeJobStatus,
    rejectJob,
    resetUserPassword,
    regenerateUserPin,
  }
}
