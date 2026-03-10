import { useCallback, useEffect, useMemo, useState } from 'react'

import { getJobs } from '../services/jobsService'

export const STATUS_FILTERS = ['todos', 'pendiente', 'en_proceso', 'control', 'listo', 'entregado']

const showingAll     = (filter) => filter === 'todos'
const filterByStatus = (jobs, filter) => jobs.filter((job) => job.status === filter)
const applyFilter    = (jobs, filter) => showingAll(filter) ? jobs : filterByStatus(jobs, filter)

export function useJobs() {
  const [jobs, setJobs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('todos')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getJobs()
      setJobs(data)
    } catch {
      setError('No se pudieron cargar los trabajos.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filteredJobs = useMemo(
    () => applyFilter(jobs, activeFilter),
    [jobs, activeFilter],
  )

  return { filteredJobs, isLoading, error, activeFilter, setActiveFilter, refresh: load }
}
