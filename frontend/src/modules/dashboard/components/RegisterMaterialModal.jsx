// TODO (Fase 3 — Fichaje/GMAO): ampliar este modal con:
// - Asociar el consumo a un trabajo concreto (no solo descontar del stock global)
// - Historial de consumos por OT para trazabilidad
// - Búsqueda/filtrado de materiales cuando la lista sea larga
// - Soporte para consumo de múltiples materiales en una sola acción
// - Validación de unidades (no mezclar kg con ud)

import { useRef } from 'react'
import { useRegisterMaterialForm } from '../hooks/useRegisterMaterialForm'
import useFocusTrap from '../../core/hooks/useFocusTrap'

const labelBase = 'mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400'
const selectBase =
  'w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
const inputBase =
  'w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'

// ── Colores por tono de stock ────────────────────────────────────────────────
const TONE_COLOR = {
  success: 'text-emerald-400',
  warning: 'text-yellow-400',
  danger: 'text-rose-400',
}
const toneColor = (tone) => TONE_COLOR[tone] ?? 'text-slate-400'

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

const errorBanner = ({ error }) => error && <p className="mt-3 text-sm text-rose-400">{error}</p>

// ── Componente principal ─────────────────────────────────────────────────────
const RegisterMaterialModal = ({ stock, onClose, onConfirm }) => {
  const modalRef = useRef(null)
  useFocusTrap(modalRef)
  const form = useRegisterMaterialForm({ stock, onConfirm, onClose })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Registrar material usado"
        className="modal-slide-up relative z-10 w-full max-w-[420px] rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl"
      >
        {/* Drag handle — indica bottom-sheet en móvil */}
        <div
          className="mx-auto mb-4 h-1 w-8 rounded-full bg-slate-600 sm:hidden"
          aria-hidden="true"
        />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-100">
            Registrar material usado
          </h2>
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
            value={form.materialId}
            onChange={(e) => {
              form.setMaterialId(e.target.value)
              form.clearError()
            }}
            className={selectBase}
          >
            {stock.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {stockAvailability({ item: form.selectedItem })}
        </div>

        <div className="mt-3 grid gap-1">
          <label className={labelBase}>
            Cantidad consumida ({form.selectedItem?.unit ?? 'ud'})
          </label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={form.consumed}
            onChange={(e) => {
              form.setConsumed(e.target.value)
              form.clearError()
            }}
            placeholder="0"
            className={inputBase}
          />
        </div>

        {errorBanner({ error: form.error })}

        <button
          type="button"
          onClick={form.confirm}
          disabled={form.isLoading || !form.consumed}
          className="mt-5 h-12 w-full rounded-xl bg-gradient-to-r from-amber-500 to-blue-600 text-sm font-bold tracking-[0.1em] text-white transition hover:from-amber-400 hover:to-blue-500 disabled:opacity-60"
        >
          {form.isLoading ? 'Guardando...' : 'Confirmar uso'}
        </button>
      </div>
    </div>
  )
}

export default RegisterMaterialModal
