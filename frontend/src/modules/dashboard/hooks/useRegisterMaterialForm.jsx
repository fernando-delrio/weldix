import { useState } from 'react'

// Validaciones nombradas — cada condición tiene su propio nombre (CLAUDE.md §4)
const parsedQty      = (consumed)       => parseFloat(consumed)
const isInvalidQty   = (qty)            => !qty || qty <= 0
const exceedsStock   = (item, qty)      => item && qty > item.quantity
const validationError = (consumed, item) => {
  const qty = parsedQty(consumed)
  return isInvalidQty(qty)    ? 'Introduce una cantidad válida'
    : exceedsStock(item, qty) ? 'No hay suficiente stock disponible'
    : null
}

export const useRegisterMaterialForm = ({ stock, onConfirm, onClose }) => {
  const [materialId, setMaterialId] = useState(stock[0]?.id ?? '')
  const [consumed, setConsumed]     = useState('')
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState('')

  const selectedItem = stock.find((s) => s.id === Number(materialId))
  const clearError   = () => setError('')

  const confirm = async () => {
    const validError = validationError(consumed, selectedItem)
    if (validError) { setError(validError); return }
    setIsLoading(true)
    clearError()
    try {
      await onConfirm(Number(materialId), parsedQty(consumed))
      onClose()
    } catch {
      setError('Error al registrar el material. Inténtalo de nuevo.')
      setIsLoading(false)
    }
  }

  return { materialId, setMaterialId, consumed, setConsumed, selectedItem, isLoading, error, clearError, confirm }
}
