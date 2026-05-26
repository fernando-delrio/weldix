import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteFoto,
  getFotoObjectUrl,
  getFotosParaTrabajo,
  uploadFoto,
} from '../services/fotosService'

export const useFotos = (jobId) => {
  const [fotos, setFotos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null) // foto abierta en lightbox
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const objectUrlsRef = useRef([])

  const revokeObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    objectUrlsRef.current = []
  }, [])

  const withPreviewUrls = useCallback(async (items) => {
    const enriched = await Promise.all(
      items.map(async (foto) => {
        const previewUrl = await getFotoObjectUrl(foto)
        objectUrlsRef.current.push(previewUrl)
        return { ...foto, previewUrl }
      })
    )
    return enriched
  }, [])

  const cargarFotos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getFotosParaTrabajo(jobId)
      revokeObjectUrls()
      setFotos(await withPreviewUrls(data))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [jobId, revokeObjectUrls, withPreviewUrls])

  useEffect(() => {
    cargarFotos()
  }, [cargarFotos])

  useEffect(() => revokeObjectUrls, [revokeObjectUrls])

  const subirFoto = useCallback(
    async (file, etiqueta = 'durante') => {
      setIsUploading(true)
      setError(null)
      try {
        const nueva = await uploadFoto(jobId, file, etiqueta)
        const [fotoConPreview] = await withPreviewUrls([nueva])
        setFotos((prev) => [...prev, fotoConPreview])
      } catch (err) {
        setError(err.message)
      } finally {
        setIsUploading(false)
      }
    },
    [jobId, withPreviewUrls]
  )

  const eliminarFoto = useCallback(
    async (fotoId) => {
      setError(null)
      try {
        await deleteFoto(fotoId)
        setFotos((prev) => {
          const deleted = prev.find((f) => f.id === fotoId)
          if (deleted?.previewUrl) {
            URL.revokeObjectURL(deleted.previewUrl)
            objectUrlsRef.current = objectUrlsRef.current.filter(
              (url) => url !== deleted.previewUrl
            )
          }
          return prev.filter((f) => f.id !== fotoId)
        })
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
