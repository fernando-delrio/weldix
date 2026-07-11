import { useCallback, useEffect, useState } from 'react'
import { getPublicJobStatus } from '../services/seguimientoService'

const POLL_MS = 30_000

const useSeguimiento = (token) => {
  const [job, setJob] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetch = useCallback(async () => {
    if (!token) return
    try {
      const data = await getPublicJobStatus(token)
      setJob(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, POLL_MS)
    return () => clearInterval(interval)
  }, [fetch])

  return { job, isLoading, error, lastUpdated, refresh: fetch }
}

export default useSeguimiento
