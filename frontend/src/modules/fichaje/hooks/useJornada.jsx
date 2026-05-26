import { useCallback, useEffect, useRef, useState } from 'react'
import {
  finalizarJornada,
  getJornadaActiva,
  iniciarJornada,
  getMisJornadas,
} from '../services/fichajeService'

// "08:02" — hora real de inicio de jornada
const formatHora = (iso) =>
  new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

// Elapsed desde inicio: "2h 15min"
const formatearElapsed = (segundos) => {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

const segundosDesde = (inicio) => Math.floor((Date.now() - new Date(inicio).getTime()) / 1000)

export const useJornada = () => {
  const [jornada, setJornada] = useState(null)
  const [jornadaCerrada, setJornadaCerrada] = useState(null) // última jornada finalizada
  const [elapsed, setElapsed] = useState('') // "2h 15min"
  const [historial, setHistorial] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  const arrancarTicker = useCallback((inicio) => {
    clearInterval(intervalRef.current)
    setElapsed(formatearElapsed(segundosDesde(inicio)))
    intervalRef.current = setInterval(() => {
      setElapsed(formatearElapsed(segundosDesde(inicio)))
    }, 30_000) // actualizar cada 30s — suficiente para mostrar minutos
  }, [])

  const pararTicker = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
    setElapsed('')
  }, [])

  useEffect(() => () => clearInterval(intervalRef.current), [])

  const cargarJornada = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const activa = await getJornadaActiva()
      setJornada(activa)
      if (activa) arrancarTicker(activa.inicio)
      else pararTicker()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [arrancarTicker, pararTicker])

  useEffect(() => {
    cargarJornada()
  }, [cargarJornada])

  const cargarHistorial = useCallback(async () => {
    try {
      const data = await getMisJornadas()
      setHistorial(data)
    } catch {
      /* no-op — historial es secundario */
    }
  }, [])

  const iniciar = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)
    setJornadaCerrada(null)
    try {
      const nueva = await iniciarJornada()
      setJornada(nueva)
      arrancarTicker(nueva.inicio)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [arrancarTicker])

  const finalizar = useCallback(async () => {
    if (!jornada) return
    setIsSubmitting(true)
    setError(null)
    try {
      const cerrada = await finalizarJornada(jornada.id)
      pararTicker()
      setJornada(null)
      setJornadaCerrada(cerrada) // guardamos para mostrar el resumen
      await cargarHistorial() // refrescamos el historial
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [jornada, pararTicker, cargarHistorial])

  // horaEntrada: "08:02" — solo cuando hay jornada activa
  const horaEntrada = jornada ? formatHora(jornada.inicio) : null

  return {
    jornada,
    jornadaActiva: Boolean(jornada),
    jornadaCerrada,
    horaEntrada,
    elapsed,
    historial,
    isLoading,
    isSubmitting,
    error,
    iniciar,
    finalizar,
    cargarHistorial,
  }
}
