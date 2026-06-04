import { useCallback, useEffect, useState } from 'react'
import {
  crearTurnosBulk,
  eliminarTurno,
  getCambiosTurno,
  getTurnos,
  revisarCambioTurno,
} from '../services/rrhhService'

const isoWeekStart = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  return d
}

const toDateStr = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const semanaActual = () => {
  const lunes = isoWeekStart(new Date())
  const domingo = new Date(lunes)
  domingo.setDate(domingo.getDate() + 6)
  return { fecha_inicio: toDateStr(lunes), fecha_fin: toDateStr(domingo) }
}

export const useRrhhTurnos = () => {
  const [turnos, setTurnos] = useState([])
  const [cambios, setCambios] = useState([])
  const [semana, setSemana] = useState(semanaActual)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [turnosData, cambiosData] = await Promise.all([
        getTurnos(semana),
        getCambiosTurno().catch(() => []),
      ])
      setTurnos(turnosData)
      setCambios(cambiosData)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [semana])

  useEffect(() => {
    cargar()
  }, [cargar])

  const irSemanaAnterior = useCallback(() => {
    setSemana(({ fecha_inicio }) => {
      const lunes = new Date(fecha_inicio + 'T00:00:00')
      lunes.setDate(lunes.getDate() - 7)
      const domingo = new Date(lunes)
      domingo.setDate(domingo.getDate() + 6)
      return { fecha_inicio: toDateStr(lunes), fecha_fin: toDateStr(domingo) }
    })
  }, [])

  const irSemanaSiguiente = useCallback(() => {
    setSemana(({ fecha_inicio }) => {
      const lunes = new Date(fecha_inicio + 'T00:00:00')
      lunes.setDate(lunes.getDate() + 7)
      const domingo = new Date(lunes)
      domingo.setDate(domingo.getDate() + 6)
      return { fecha_inicio: toDateStr(lunes), fecha_fin: toDateStr(domingo) }
    })
  }, [])

  const guardarTurnos = useCallback(async (turnosData) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const creados = await crearTurnosBulk(turnosData)
      setTurnos((prev) => {
        const porId = new Map(prev.map((t) => [t.id, t]))
        creados.forEach((t) => porId.set(t.id, t))
        return Array.from(porId.values())
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const borrarTurno = useCallback(async (turnoId) => {
    setError(null)
    try {
      await eliminarTurno(turnoId)
      setTurnos((prev) => prev.filter((t) => t.id !== turnoId))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const aprobarCambio = useCallback(
    async (solicitudId, { estado, comentario_admin }) => {
      setIsSubmitting(true)
      setError(null)
      try {
        const actualizado = await revisarCambioTurno(solicitudId, { estado, comentario_admin })
        setCambios((prev) => prev.map((c) => (c.id === solicitudId ? actualizado : c)))
        await cargar()
      } catch (err) {
        setError(err.message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [cargar]
  )

  const cambiosPendientes = cambios.filter((c) => c.estado === 'pendiente')

  return {
    turnos,
    cambios,
    cambiosPendientes,
    semana,
    isLoading,
    isSubmitting,
    error,
    irSemanaAnterior,
    irSemanaSiguiente,
    guardarTurnos,
    borrarTurno,
    aprobarCambio,
    recargar: cargar,
  }
}
