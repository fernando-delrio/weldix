import { useCallback, useEffect, useState } from 'react'
import {
  deleteNomina,
  descargarNomina,
  getMisNominas,
  getNominas,
  uploadNomina,
} from '../services/nominasService'

// ── Hook admin ─────────────────────────────────────────────────────────────────

export const useNominasAdmin = ({ operarioId, year } = {}) => {
  const [nominas, setNominas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const fetchNominas = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getNominas({ operarioId, year })
      setNominas(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [operarioId, year])

  useEffect(() => {
    fetchNominas()
  }, [fetchNominas])

  const handleUpload = async ({ operarioId: opId, year: y, month: m, file }) => {
    setUploading(true)
    setUploadError(null)
    try {
      await uploadNomina({ operarioId: opId, year: y, month: m, file })
      await fetchNominas()
      return true
    } catch (err) {
      setUploadError(err.message)
      return false
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (nominaId) => {
    try {
      await deleteNomina(nominaId)
      setNominas((prev) => prev.filter((nomina) => nomina.id !== nominaId))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDescargar = async (nomina) => {
    try {
      await descargarNomina(nomina.id, nomina.filename)
    } catch (err) {
      setError(err.message)
    }
  }

  return {
    nominas,
    isLoading,
    error,
    uploading,
    uploadError,
    handleUpload,
    handleDelete,
    handleDescargar,
    refresh: fetchNominas,
  }
}

// ── Hook operario ──────────────────────────────────────────────────────────────

export const useMisNominas = (year) => {
  const [nominas, setNominas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    getMisNominas(year)
      .then((data) => {
        if (active) setNominas(data)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [year])

  const handleDescargar = async (nomina) => {
    try {
      await descargarNomina(nomina.id, nomina.filename)
    } catch (err) {
      setError(err.message)
    }
  }

  return { nominas, isLoading, error, handleDescargar }
}
