import { useCallback, useEffect, useState } from 'react'
import {
  finalizarRegistro,
  getHorasOT,
  getRegistroActivo,
  iniciarRegistro,
} from '../../registro_horas/services/registroHorasService'

/**
 * Hook de fichaje para un trabajo concreto.
 * Gestiona: ¿hay fichaje abierto? → mostrar botón "Fichar salida" o "Fichar entrada".
 */
export const useFichaje = (jobId) => {
  const [fichajeActivo, setFichajeActivo] = useState(null)
  const [horasTotales, setHorasTotales] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const cargarEstado = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [activo, horas] = await Promise.all([getRegistroActivo(), getHorasOT(jobId)])
      // El fichaje activo puede ser de otro trabajo — solo lo mostramos si es de este
      setFichajeActivo(activo?.job_id === jobId ? activo : null)
      setHorasTotales(horas)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    cargarEstado()
  }, [cargarEstado])

  const ficharEntrada = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const nuevo = await iniciarRegistro(jobId)
      setFichajeActivo(nuevo)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [jobId])

  const ficharSalida = useCallback(async () => {
    if (!fichajeActivo) return
    setIsSubmitting(true)
    setError(null)
    try {
      await finalizarRegistro(fichajeActivo.id)
      // Recargamos para actualizar horas totales
      await cargarEstado()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [fichajeActivo, cargarEstado])

  const estaFichandoEstetrabajo = fichajeActivo?.job_id === jobId

  return {
    fichajeActivo,
    horasTotales,
    isLoading,
    isSubmitting,
    error,
    estaFichandoEstetrabajo,
    ficharEntrada,
    ficharSalida,
  }
}
