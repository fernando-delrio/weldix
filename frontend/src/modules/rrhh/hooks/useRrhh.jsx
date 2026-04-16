import { useCallback, useEffect, useState } from 'react'
import {
  cancelarSolicitud,
  crearSolicitud,
  getMiSaldo,
  getMisSolicitudes,
  getTiposAusencia,
  getTodasLasSolicitudes,
  revisarSolicitud,
} from '../services/rrhhService'

export const useRrhh = ({ isAdmin = false } = {}) => {
  const [saldo,          setSaldo]          = useState(null)
  const [solicitudes,    setSolicitudes]    = useState([])
  const [tipos,          setTipos]          = useState([])
  const [isLoading,      setIsLoading]      = useState(true)
  const [isSubmitting,   setIsSubmitting]   = useState(false)
  const [error,          setError]          = useState(null)
  const [modalCrear,     setModalCrear]     = useState(false)
  const [revisandoId,    setRevisandoId]    = useState(null)  // id de solicitud que se está revisando

  const cargarDatos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [tiposData, solicitudesData] = await Promise.all([
        getTiposAusencia(),
        isAdmin ? getTodasLasSolicitudes() : getMisSolicitudes(),
      ])
      setTipos(tiposData)
      setSolicitudes(solicitudesData)

      // El saldo solo aplica al operario
      if (!isAdmin) {
        const saldoData = await getMiSaldo()
        setSaldo(saldoData)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [isAdmin])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const crear = useCallback(async (formData) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const nueva = await crearSolicitud(formData)
      setSolicitudes((prev) => [nueva, ...prev])
      // Recargar saldo para reflejar días pendientes actualizados
      const saldoActualizado = await getMiSaldo()
      setSaldo(saldoActualizado)
      setModalCrear(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const cancelar = useCallback(async (solicitudId) => {
    setError(null)
    try {
      await cancelarSolicitud(solicitudId)
      setSolicitudes((prev) =>
        prev.map((s) => (s.id === solicitudId ? { ...s, estado: 'cancelada' } : s))
      )
      if (!isAdmin) {
        const saldoActualizado = await getMiSaldo()
        setSaldo(saldoActualizado)
      }
    } catch (err) {
      setError(err.message)
    }
  }, [isAdmin])

  const revisar = useCallback(async (solicitudId, { estado, comentario_admin }) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const actualizada = await revisarSolicitud(solicitudId, { estado, comentario_admin })
      setSolicitudes((prev) => prev.map((s) => (s.id === solicitudId ? actualizada : s)))
      setRevisandoId(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente')

  return {
    saldo,
    solicitudes,
    tipos,
    pendientes,
    isLoading,
    isSubmitting,
    error,
    modalCrear,
    setModalCrear,
    revisandoId,
    setRevisandoId,
    crear,
    cancelar,
    revisar,
    recargar: cargarDatos,
  }
}
