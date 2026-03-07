import { useCallback, useEffect, useMemo, useState } from 'react'

import { getJobs } from '../services/jobsService'

export const STATUS_FILTERS = ['Todos', 'Pendiente', 'En proceso', 'Control', 'Completado']

const showingAll      = (filter) => filter === 'Todos'
const filterByStatus  = (jobs, status) => jobs.filter((job) => job.status === status)
const applyFilter     = (jobs, filter) => showingAll(filter) ? jobs : filterByStatus(jobs, filter)

export function useJobs() {
  const [jobs, setJobs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('Todos')

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
