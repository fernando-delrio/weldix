import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteFoto, getFotosParaTrabajo, uploadFoto } from '../services/fotosService'

export const useFotos = (jobId) => {
  const [fotos, setFotos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null) // foto abierta en lightbox
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const cargarFotos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getFotosParaTrabajo(jobId)
      setFotos(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    cargarFotos()
  }, [cargarFotos])

  const subirFoto = useCallback(
    async (file, etiqueta = 'durante') => {
      setIsUploading(true)
      setError(null)
      try {
        const nueva = await uploadFoto(jobId, file, etiqueta)
        setFotos((prev) => [...prev, nueva])
      } catch (err) {
        setError(err.message)
      } finally {
        setIsUploading(false)
      }
    },
    [jobId]
  )

  const eliminarFoto = useCallback(
    async (fotoId) => {
      setError(null)
      try {
        await deleteFoto(fotoId)
        setFotos((prev) => prev.filter((f) => f.id !== fotoId))
        if (lightbox?.id === fotoId) setLightbox(null)
      } catch (err) {
        setError(err.message)
      }
    },
    [lightbox]
  )

  const abrirLightbox = (foto) => setLightbox(foto)
  const cerrarLightbox = () => setLightbox(null)

  const onFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (file) subirFoto(file)
      // Reset para poder subir el mismo archivo dos veces
      e.target.value = ''
    },
    [subirFoto]
  )

  return {
    fotos,
    isLoading,
    isUploading,
    lightbox,
    error,
    fileInputRef,
    abrirLightbox,
    cerrarLightbox,
    subirFoto,
    eliminarFoto,
    onFileChange,
  }
}
