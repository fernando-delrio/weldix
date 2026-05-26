import { useState, useCallback } from 'react'
import { superadminService } from '../services/superadminService'

const STORAGE_KEY = 'weldix_superadmin_key'

export const useSuperAdmin = () => {
  const [key, setKey] = useState(() => sessionStorage.getItem(STORAGE_KEY) ?? '')
  const [metrics, setMetrics] = useState(null)
  const [workspaces, setWorkspaces] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const login = useCallback(async (inputKey) => {
    setIsLoading(true)
    setError('')
    try {
      const [m, w] = await Promise.all([
        superadminService.getMetrics(inputKey),
        superadminService.getWorkspaces(inputKey),
      ])
      sessionStorage.setItem(STORAGE_KEY, inputKey)
      setKey(inputKey)
      setMetrics(m)
      setWorkspaces(w)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!key) return
    setIsLoading(true)
    try {
      const [m, w] = await Promise.all([
        superadminService.getMetrics(key),
        superadminService.getWorkspaces(key),
      ])
      setMetrics(m)
      setWorkspaces(w)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [key])

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY)
    setKey('')
    setMetrics(null)
    setWorkspaces([])
  }

  const isAuthenticated = !!key && !!metrics

  return { isAuthenticated, metrics, workspaces, isLoading, error, login, refresh, logout }
}
