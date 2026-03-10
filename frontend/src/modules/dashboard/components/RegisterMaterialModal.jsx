// TODO (Fase 3 — Fichaje/GMAO): ampliar este modal con:
// - Asociar el consumo a un trabajo concreto (no solo descontar del stock global)
// - Historial de consumos por OT para trazabilidad
// - Búsqueda/filtrado de materiales cuando la lista sea larga
// - Soporte para consumo de múltiples materiales en una sola acción
// - Validación de unidades (no mezclar kg con ud)

import { useState } from 'react'

const labelBase  = 'mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-400'
const selectBase = 'w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
const inputBase  = 'w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'

// ── Colores por tono de stock ────────────────────────────────────────────────
const TONE_COLOR = { success: 'text-emerald-400', warning: 'text-yellow-400', danger: 'text-rose-400' }
const toneColor  = (tone) => TONE_COLOR[tone] ?? 'text-slate-400'

// ── Validaciones nombradas ───────────────────────────────────────────────────
const parsedQty       = (consumed)       => parseFloat(consumed)
const isInvalidQty    = (qty)            => !qty || qty <= 0
const exceedsStock    = (item, qty)      => item && qty > item.quantity
const noItemSelected  = (item)           => !item

const validationError = (consumed, item) => {
  const qty = parsedQty(consumed)
  return isInvalidQty(qty)       ? 'Introduce una cantidad válida'
    : exceedsStock(item, qty)    ? 'No hay suficiente stock disponible'
    : null
}

// ── Subcomponentes ───────────────────────────────────────────────────────────
const StockBadge = ({ item }) => (
  <span className={`text-xs font-semibold ${toneColor(item.tone)}`}>
    {item.quantity} {item.unit} disponibles
  </span>
)

const stockAvailability = ({ item }) =>
  item && (
    <div className="mt-1 flex justify-end">
      <StockBadge item={item} />
    </div>
  )

const errorBanner = ({ error }) =>
  error && <p className="mt-3 text-sm text-rose-400">{error}</p>

// ── Componente principal ─────────────────────────────────────────────────────
const RegisterMaterialModal = ({ stock, onClose, onConfirm }) => {
  const [materialId, setMaterialId] = useState(stock[0]?.id ?? '')
  const [consumed, setConsumed]     = useState('')
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState('')

  const selectedItem  = stock.find((s) => s.id === Number(materialId))
  const clearError    = () => setError('')

  const handleConfirm = async () => {
    const validError = validationError(consumed, selectedItem)
    const onError    = (msg) => setError(msg)

    return validError
      ? onError(validError)
      : executeConfirm()
  }

  const executeConfirm = async () => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-[420px] rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-100">Registrar material usado</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-1">
          <label className={labelBase}>Material</label>
          <select
            value={materialId}
            onChange={(e) => { setMaterialId(e.target.value); clearError() }}
            className={selectBase}
          >
            {stock.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          {stockAvailability({ item: selectedItem })}
        </div>

        <div className="mt-3 grid gap-1">
          <label className={labelBase}>Cantidad consumida ({selectedItem?.unit ?? 'ud'})</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={consumed}
            onChange={(e) => { setConsumed(e.target.value); clearError() }}
            placeholder="0"
            className={inputBase}
          />
        </div>

        {errorBanner({ error })}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={isLoading || !consumed}
          className="mt-5 h-12 w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-sm font-bold tracking-[0.1em] text-white transition hover:from-sky-400 hover:to-blue-500 disabled:opacity-60"
        >
          {isLoading ? 'Guardando...' : 'Confirmar uso'}
        </button>
      </div>
    </div>
  )
}

export default RegisterMaterialModal
