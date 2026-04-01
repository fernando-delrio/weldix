import { useCallback, useEffect, useState } from 'react'
import {
  createEquipo,
  deleteEquipo,
  getEquipos,
  updateEquipo,
  updateEquipoEstado,
} from '../services/equiposService'

export const useEquipos = () => {
  const [equipos,     setEquipos]     = useState([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [isSubmitting,setIsSubmitting]= useState(false)
  const [error,       setError]       = useState(null)
  const [modalAbierto,setModalAbierto]= useState(false)

  const cargarEquipos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getEquipos()
      setEquipos(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { cargarEquipos() }, [cargarEquipos])

  const crearEquipo = useCallback(async (data) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const nuevo = await createEquipo(data)
      setEquipos((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setModalAbierto(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const cambiarEstado = useCallback(async (equipoId, estado) => {
    setError(null)
    try {
      const actualizado = await updateEquipoEstado(equipoId, estado)
      setEquipos((prev) => prev.map((e) => (e.id === equipoId ? actualizado : e)))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const registrarMantenimiento = useCallback(async (equipoId) => {
    const hoy = new Date().toISOString().split('T')[0]
    setError(null)
    try {
      const actualizado = await updateEquipo(equipoId, { ultimo_mantenimiento: hoy })
      setEquipos((prev) => prev.map((e) => (e.id === equipoId ? actualizado : e)))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const eliminarEquipo = useCallback(async (equipoId) => {
    setError(null)
    try {
      await deleteEquipo(equipoId)
      setEquipos((prev) => prev.filter((e) => e.id !== equipoId))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const equiposConAlerta = equipos.filter((e) => e.alerta_mantenimiento)

  return {
    equipos,
    equiposConAlerta,
    isLoading,
    isSubmitting,
    error,
    modalAbierto,
    setModalAbierto,
    crearEquipo,
    cambiarEstado,
    registrarMantenimiento,
    eliminarEquipo,
  }
}
