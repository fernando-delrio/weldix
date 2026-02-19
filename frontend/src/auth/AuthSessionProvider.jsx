import { useCallback, useEffect, useMemo, useState } from 'react'

import { AuthSessionContext } from './AuthSessionContext'
import { API_BASE_URL } from '../shared/api'

const TOKEN_STORAGE_KEY = 'weldix_access_token'

export function AuthSessionProvider({ children }) {
  const [token, setToken] = useState('')
  const [profile, setProfile] = useState(null)
  const [isFetchingProfile, setIsFetchingProfile] = useState(false)

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken('')
    setProfile(null)
  }, [])

  const saveToken = useCallback((nextToken) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken)
    setToken(nextToken)
  }, [])

  const refreshProfile = useCallback(
    async (authToken) => {
      if (!authToken) return null
      setIsFetchingProfile(true)

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.detail || 'No se pudo validar la sesion')
        }

        setProfile(data)
        return data
      } catch (err) {
        clearSession()
        throw err
      } finally {
        setIsFetchingProfile(false)
      }
    },
    [clearSession],
  )

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!savedToken) return
    setToken(savedToken)
    refreshProfile(savedToken).catch(() => {})
  }, [refreshProfile])

  const value = useMemo(
    () => ({
      token,
      profile,
      isFetchingProfile,
      saveToken,
      refreshProfile,
      clearSession,
    }),
    [token, profile, isFetchingProfile, saveToken, refreshProfile, clearSession],
  )

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}
