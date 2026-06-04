import { useCallback, useEffect, useState } from 'react'
import {
  actualizarAccidente,
  crearAccidente,
  crearPermisoEspecial,
  getAccidentes,
  getIndicesSiniestralidad,
  getPermisosEspeciales,
} from '../services/rrhhService'

export const useRrhhSiniestralidad = ({ operarioId = null } = {}) => {
  const [accidentes, setAccidentes] = useState([])
  const [permisos, setPermisos] = useState([])
  const [indices, setIndices] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [yearIndices, setYearIndices] = useState(new Date().getFullYear())

  const cargar = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [accData, permData, indData] = await Promise.all([
        getAccidentes(),
        getPermisosEspeciales(operarioId ? { operario_id: operarioId } : {}),
        getIndicesSiniestralidad(yearIndices),
      ])
      setAccidentes(accData)
      setPermisos(permData)
      setIndices(indData)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [operarioId, yearIndices])

  useEffect(() => {
    cargar()
  }, [cargar])

  const reportarAccidente = useCallback(async (data) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const nuevo = await crearAccidente(data)
      setAccidentes((prev) => [nuevo, ...prev])
      return nuevo
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const editarAccidente = useCallback(async (accidenteId, data) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const actualizado = await actualizarAccidente(accidenteId, data)
      setAccidentes((prev) => prev.map((a) => (a.id === accidenteId ? actualizado : a)))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const registrarPermiso = useCallback(async (data, archivo = null) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const nuevo = await crearPermisoEspecial(data, archivo)
      setPermisos((prev) => [nuevo, ...prev])
      return nuevo
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const accidentesAbiertos = accidentes.filter((a) => a.estado === 'abierto')
  const permisosConAlerta = permisos.filter((p) => p.alerta && p.estado === 'activo')

  return {
    accidentes,
    permisos,
    indices,
    accidentesAbiertos,
    permisosConAlerta,
    yearIndices,
    setYearIndices,
    isLoading,
    isSubmitting,
    error,
    reportarAccidente,
    editarAccidente,
    registrarPermiso,
    recargar: cargar,
  }
}
