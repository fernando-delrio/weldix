import { useCallback, useEffect, useRef, useState } from 'react'
import {
  finalizarRegistro,
  getHorasOT,
  getRegistroActivo,
  iniciarRegistro,
} from '../services/registroHorasService'

const segundosDesde = (inicio) => Math.floor((Date.now() - new Date(inicio).getTime()) / 1000)

const formatElapsed = (segundos) => {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

const formatHora = (iso) =>
  new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

/**
 * Hook para el registro de horas en una OT específica.
 * - registroActivo: si el operario está trabajando AHORA en esta OT
 * - resumen: todas las horas acumuladas en la OT (todos los operarios)
 */
export const useRegistroHoras = (jobId) => {
  const [registroActivo, setRegistroActivo] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [elapsed, setElapsed] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  const arrancarTicker = useCallback((inicio) => {
    clearInterval(intervalRef.current)
    setElapsed(formatElapsed(segundosDesde(inicio)))
    intervalRef.current = setInterval(
      () => setElapsed(formatElapsed(segundosDesde(inicio))),
      30_000
    )
  }, [])

  const pararTicker = useCallback(() => {
    clearInterval(intervalRef.current)
    setElapsed('')
  }, [])

  useEffect(() => () => clearInterval(intervalRef.current), [])

  const cargar = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [activo, hrs] = await Promise.all([getRegistroActivo(), getHorasOT(jobId)])
      // El registro activo puede ser de otra OT — solo lo mostramos si es de esta
      const esDeEstaOT = activo?.job_id === jobId
      setRegistroActivo(esDeEstaOT ? activo : null)
      setResumen(hrs)
      if (esDeEstaOT && activo) arrancarTicker(activo.inicio)
      else pararTicker()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [jobId, arrancarTicker, pararTicker])

  useEffect(() => {
    cargar()
  }, [cargar])

  const iniciar = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const nuevo = await iniciarRegistro(jobId)
      setRegistroActivo(nuevo)
      arrancarTicker(nuevo.inicio)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [jobId, arrancarTicker])

  const detener = useCallback(async () => {
    if (!registroActivo) return
    setIsSubmitting(true)
    setError(null)
    try {
      await finalizarRegistro(registroActivo.id)
      pararTicker()
      setRegistroActivo(null)
      // Recargamos el resumen para ver las horas actualizadas
      const hrs = await getHorasOT(jobId)
      setResumen(hrs)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [registroActivo, jobId, pararTicker])

  const horaInicio = registroActivo ? formatHora(registroActivo.inicio) : null

  return {
    registroActivo,
    resumen,
    elapsed,
    horaInicio,
    isLoading,
    isSubmitting,
    error,
    iniciar,
    detener,
  }
}
