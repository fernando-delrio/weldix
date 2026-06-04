import { useCallback, useEffect, useState } from 'react'
import {
  actualizarEstadoEpi,
  crearCertificado,
  crearEpi,
  crearReconocimiento,
  eliminarEpi,
  getCertificados,
  getEpis,
  getReconocimientos,
  getTiposCertificado,
  getTiposEpi,
} from '../services/rrhhService'
import { consumeMaterial } from '../../stock/services/stockService'

export const useRrhhLegal = ({ operarioId = null } = {}) => {
  const [epis, setEpis] = useState([])
  const [certificados, setCertificados] = useState([])
  const [reconocimientos, setReconocimientos] = useState([])
  const [tiposEpi, setTiposEpi] = useState([])
  const [tiposCertificado, setTiposCertificado] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [episData, certsData, recsData, tiposEpiData, tiposCertData] = await Promise.all([
        getEpis(operarioId ? { operario_id: operarioId } : {}),
        getCertificados(operarioId ? { operario_id: operarioId } : {}),
        getReconocimientos(operarioId ? { operario_id: operarioId } : {}),
        getTiposEpi(),
        getTiposCertificado(),
      ])
      setEpis(episData)
      setCertificados(certsData)
      setReconocimientos(recsData)
      setTiposEpi(tiposEpiData)
      setTiposCertificado(tiposCertData)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [operarioId])

  useEffect(() => {
    cargar()
  }, [cargar])

  // stockItemId es opcional: si se pasa, consume esa cantidad del stock antes de registrar el EPI
  const registrarEpi = useCallback(async (data, stockItemId = null) => {
    setIsSubmitting(true)
    setError(null)
    try {
      // Primero consumir del stock — si falla (sin stock), no se registra el EPI
      if (stockItemId) {
        await consumeMaterial(stockItemId, data.cantidad)
      }
      const nuevo = await crearEpi(data)
      setEpis((prev) => [nuevo, ...prev])
      return nuevo
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const cambiarEstadoEpi = useCallback(async (epiId, estado) => {
    setError(null)
    try {
      const actualizado = await actualizarEstadoEpi(epiId, estado)
      setEpis((prev) => prev.map((epi) => (epi.id === epiId ? actualizado : epi)))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const borrarEpi = useCallback(async (epiId) => {
    setError(null)
    try {
      await eliminarEpi(epiId)
      setEpis((prev) => prev.filter((epi) => epi.id !== epiId))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const registrarCertificado = useCallback(async (data, archivo = null) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const nuevo = await crearCertificado(data, archivo)
      setCertificados((prev) => [nuevo, ...prev])
      return nuevo
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const registrarReconocimiento = useCallback(async (data, archivo = null) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const nuevo = await crearReconocimiento(data, archivo)
      setReconocimientos((prev) => [nuevo, ...prev])
      return nuevo
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const episConAlerta = epis.filter((epi) => epi.alerta && epi.estado === 'activo')
  const certsConAlerta = certificados.filter((cert) => cert.alerta && cert.estado === 'vigente')

  return {
    epis,
    certificados,
    reconocimientos,
    tiposEpi,
    tiposCertificado,
    episConAlerta,
    certsConAlerta,
    isLoading,
    isSubmitting,
    error,
    registrarEpi,
    cambiarEstadoEpi,
    borrarEpi,
    registrarCertificado,
    registrarReconocimiento,
    recargar: cargar,
  }
}
