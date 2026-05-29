import { useState, useEffect, useCallback } from 'react'
import * as stockService from '../services/stockService'

export const useStockPage = () => {
  const [materials, setMaterials] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState('')

  const showFeedback = (msg) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 4000)
  }

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await stockService.getStock()
      setMaterials(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (data) => {
    await stockService.createMaterial(data)
    showFeedback('Material creado.')
    load()
  }

  const handleUpdate = async (id, data) => {
    await stockService.updateMaterial(id, data)
    showFeedback('Material actualizado.')
    load()
  }

  const handleDelete = async (id) => {
    await stockService.deleteMaterial(id)
    showFeedback('Material eliminado.')
    load()
  }

  const handleRestock = async (id, cantidad) => {
    await stockService.restockMaterial(id, cantidad)
    showFeedback('Stock actualizado.')
    load()
  }

  const handleBulkRestock = async (entries) => {
    for (const { id, cantidad } of entries) {
      await stockService.restockMaterial(id, cantidad)
    }
    showFeedback(
      `${entries.length} entrada${entries.length !== 1 ? 's' : ''} registrada${entries.length !== 1 ? 's' : ''}.`
    )
    load()
  }

  const handleParseAlbaran = async (texto) => {
    return await stockService.parseAlbaran(texto)
  }

  const handleGenerarVariantes = async (data) => {
    const result = await stockService.generarVariantes(data)
    showFeedback(`${result.creadas} variantes creadas, ${result.omitidas} omitidas.`)
    load()
    return result
  }

  return {
    materials,
    isLoading,
    error,
    feedback,
    refresh: load,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleRestock,
    handleBulkRestock,
    handleGenerarVariantes,
    handleParseAlbaran,
  }
}
