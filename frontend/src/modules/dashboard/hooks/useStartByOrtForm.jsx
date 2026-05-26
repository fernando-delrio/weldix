import { useState } from 'react'
import { getJobByCode } from '../services/workerDashboardService'

export const useStartByOrtForm = ({ onStart, onClose }) => {
  const [code, setCode] = useState('')
  const [job, setJob] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState('')

  const search = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setIsSearching(true)
    setError('')
    setJob(null)
    try {
      const found = await getJobByCode(code.trim())
      setJob(found)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSearching(false)
    }
  }

  const confirm = async () => {
    if (!job) return
    setIsStarting(true)
    try {
      await onStart(job.id)
      onClose()
    } catch {
      setError('Error al iniciar el trabajo. Inténtalo de nuevo.')
      setIsStarting(false)
    }
  }

  // searchByCode permite disparar la búsqueda directamente con un código
  // (usado desde el QR scanner para no requerir submit del formulario)
  const searchByCode = async (rawCode) => {
    const trimmed = rawCode.trim()
    if (!trimmed) return
    setIsSearching(true)
    setError('')
    setJob(null)
    try {
      const found = await getJobByCode(trimmed)
      setJob(found)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSearching(false)
    }
  }

  return { code, setCode, job, isSearching, isStarting, error, search, searchByCode, confirm }
}
