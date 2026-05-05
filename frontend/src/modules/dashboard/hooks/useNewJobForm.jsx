import { useEffect, useState } from 'react'
import { createJob, getOperarios } from '../services/workerDashboardService'

export const JOB_TYPES = ['Inox', 'Caldereria Industrial', 'Estructura Metalica', 'Otro']

export const useNewJobForm = ({ onCreated }) => {
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState(JOB_TYPES[0])
  const [client, setClient] = useState('')
  const [due, setDue] = useState('')
  const [operarioId, setOperarioId] = useState('')
  const [operarios, setOperarios] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getOperarios()
      .then(setOperarios)
      .catch(() => {})
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const job = await createJob({
        code: code || null,
        titulo: title,
        cliente: client,
        descripcion: type,
        fecha_inicio: due || null,
        operario_id: operarioId ? Number(operarioId) : null,
      })
      onCreated({ id: job.id, title: job.titulo, code: job.code })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    code,
    setCode,
    title,
    setTitle,
    type,
    setType,
    client,
    setClient,
    due,
    setDue,
    operarioId,
    setOperarioId,
    operarios,
    isSubmitting,
    error,
    submit,
  }
}
