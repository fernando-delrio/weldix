// 🆕 useParams — lee el segmento dinámico ":id" directamente de la URL.
// Cuando el usuario navega a /app/trabajos/5, useParams() devuelve { id: "5" }.
// Es como un prop que viene de la URL en lugar de venir del componente padre.
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getJobById, advanceJobStatus, getJobHistory } from '../services/jobsService'
import { sanitizeJobDetail, sanitizeEvent } from '../lib/jobsModel'
import { getStatusConfig } from '../../core/lib/statusConfig'

// Helpers de validación nombrados — sigue la convención CLAUDE.md §4
const hasNextStatus    = (job)         => Boolean(getStatusConfig(job.statusKey).next)
const canAdvanceJob    = (job)         => Boolean(job) && hasNextStatus(job)
const nextStateFor     = (job)         => getStatusConfig(job.statusKey)

const executeLoad = async (id, setJob, setHistory, setError) => {
  try {
    const [raw, events] = await Promise.all([getJobById(id), getJobHistory(id)])
    setJob(sanitizeJobDetail(raw))
    setHistory(events.map(sanitizeEvent))
  } catch (err) {
    setError(err.message || 'No se pudo cargar el trabajo.')
  }
}

const executeAdvance = async (job, reload, setError) => {
  const { next, nextProgress } = nextStateFor(job)
  try {
    await advanceJobStatus(job.id, next, nextProgress)
    await reload()
  } catch (err) {
    setError(err.message || 'No se pudo actualizar el estado.')
  }
}

export const useJobDetail = () => {
  const { id } = useParams()

  const [job, setJob]               = useState(null)
  const [history, setHistory]       = useState([])
  const [isLoading, setIsLoading]   = useState(true)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [error, setError]           = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    await executeLoad(id, setJob, setHistory, setError)
    setIsLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const advance = async () => {
    if (!canAdvanceJob(job)) return
    setIsAdvancing(true)
    await executeAdvance(job, load, setError)
    setIsAdvancing(false)
  }

  return { job, history, isLoading, isAdvancing, error, advance, canAdvance: canAdvanceJob(job) }
}
