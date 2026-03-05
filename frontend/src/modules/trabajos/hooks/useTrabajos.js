import { useCallback, useEffect, useMemo, useState } from 'react'

import { getTrabajos } from '../services/trabajosService'

export const STATUS_FILTERS = ['Todos', 'Pendiente', 'En proceso', 'Control', 'Completado']

export function useTrabajos() {
  const [jobs, setJobs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('Todos')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getTrabajos()
      setJobs(data)
    } catch {
      setError('No se pudieron cargar los trabajos.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filteredJobs = useMemo(() => {
    if (activeFilter === 'Todos') return jobs
    return jobs.filter((job) => job.status === activeFilter)
  }, [jobs, activeFilter])

  return { filteredJobs, isLoading, error, activeFilter, setActiveFilter, refresh: load }
}
