import { useState } from 'react'
import AppShell from '../../core/components/AppShell'
import PanelCard from '../../dashboard/components/PanelCard'
import { useStockPage } from '../hooks/useStockPage'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { cx } from '../../core/lib/cx'

const CATEGORIAS = ['perfil', 'chapa', 'soldadura', 'tornilleria', 'epi', 'consumible']

const TONE_CLASSES = {
  danger:  'bg-rose-400',
  warning: 'bg-amber-400',
  success: 'bg-emerald-400',
  neutral: 'bg-slate-600',
}

const TONE_TEXT = {
  danger:  'text-rose-300',
  warning: 'text-amber-300',
  success: 'text-emerald-300',
  neutral: 'text-slate-400',
}

// ── Guards de estado ────────────────────────────────────────────────────────
const loadingState = ({ isLoading }) =>
  isLoading && (
    <PanelCard>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-800" />
        ))}
      </div>
    </PanelCard>
  )

const errorState = ({ isLoading, error, refresh }) =>
  !isLoading && error && (
    <PanelCard className="border-rose-700/40">
      <p className="text-sm font-semibold text-rose-300">{error}</p>
      <button type="button" onClick={refresh} className="mt-3 rounded-lg border border-rose-500/40 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10">
        Reintentar
      </button>
    </PanelCard>
  )

const emptyState = ({ isLoading, error, materials }) =>
  !isLoading && !error && materials.length === 0 && (
    <PanelCard>
      <p className="text-center text-sm text-slate-500">No hay materiales registrados.</p>
    </PanelCard>
  )

// ── Fila de material ────────────────────────────────────────────────────────
const MaterialRow = ({ item, isAdmin, onDelete }) => {
  const barClass = TONE_CLASSES[item.tone] ?? TONE_CLASSES.neutral
  const labelClass = TONE_TEXT[item.tone] ?? TONE_TEXT.neutral

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">
            {item.display_name ?? item.name}
          </p>
          {item.category && (
            <span className="mt-0.5 inline-block rounded bg-slate-800 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-slate-400">
              {item.category}
            </span>
          )}
          <p className="mt-1 text-xs text-slate-400">
            {item.stock_label} · {item.minimum_label}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cx('text-xs font-bold', labelClass)}>{item.level}%</span>
          {isAdmin && (
            <button
              type="button"
              aria-label={`Eliminar ${item.name}`}
              onClick={() => onDelete(item.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-500 transition hover:border-rose-500/50 hover:text-rose-400"
            >
              <i className="bx bx-trash text-base" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800">
        <div className={cx('h-1.5 rounded-full transition-all', barClass)} style={{ width: `${item.level}%` }} />
      </div>
    </article>
  )
}

// ── Modal crear material ─────────────────────────────────────────────────────
const CreateMaterialModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', category: '', quantity: '', minimum: '', unit: 'ud' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const isInvalidName  = (name) => !name.trim()
  const isInvalidQty   = (qty)  => qty !== '' && (isNaN(Number(qty)) || Number(qty) < 0)
  const isInvalidMin   = (min)  => min !== '' && (isNaN(Number(min)) || Number(min) < 0)
  const validationError = () => {
    if (isInvalidName(form.name))  return 'El nombre es obligatorio'
    if (isInvalidQty(form.quantity)) return 'Cantidad inválida'
    if (isInvalidMin(form.minimum))  return 'Mínimo inválido'
    return null
  }

  const executeSave = async () => {
    setSaving(true)
    try {
      await onSave({
        name:     form.name.trim(),
        category: form.category || null,
        quantity: form.quantity !== '' ? Number(form.quantity) : 0,
        minimum:  form.minimum  !== '' ? Number(form.minimum)  : 0,
        unit:     form.unit || 'ud',
      })
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => {
    const err = validationError()
    if (err) { setError(err); return }
    executeSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="modal-slide-up w-full max-w-lg rounded-t-2xl border border-slate-700 bg-slate-900 p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-slate-100">Nuevo material</h2>
        <div className="space-y-3">
          <input
            type="text" placeholder="Nombre *" value={form.name} onChange={set('name')}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          />
          <select
            value={form.category} onChange={set('category')}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
          >
            <option value="">Sin categoría</option>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number" placeholder="Cantidad" min="0" value={form.quantity} onChange={set('quantity')}
              className="col-span-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <input
              type="number" placeholder="Mínimo" min="0" value={form.minimum} onChange={set('minimum')}
              className="col-span-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <input
              type="text" placeholder="Unidad" value={form.unit} onChange={set('unit')}
              className="col-span-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
          {error && <p className="text-xs font-semibold text-rose-400">{error}</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-slate-800">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal generador de variantes ─────────────────────────────────────────────
const VariantGeneratorModal = ({ onClose, onGenerate }) => {
  const [category, setCategory] = useState('')
  const [unit, setUnit]         = useState('ud')
  const [minimum, setMinimum]   = useState('0')
  // attrs: array de { key: string, values: string (csv) }
  const [attrs, setAttrs]       = useState([{ key: '', values: '' }])
  const [error, setError]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [result, setResult]     = useState(null)

  const addAttr      = () => setAttrs((a) => [...a, { key: '', values: '' }])
  const removeAttr   = (i) => setAttrs((a) => a.filter((_, idx) => idx !== i))
  const updateAttr   = (i, field) => (e) =>
    setAttrs((a) => a.map((attr, idx) => idx === i ? { ...attr, [field]: e.target.value } : attr))

  const totalVariants = () => {
    try {
      return attrs.reduce((acc, { values }) => {
        const count = values.split(',').map((v) => v.trim()).filter(Boolean).length
        return count > 0 ? acc * count : acc
      }, 1)
    } catch {
      return 0
    }
  }

  const executeGenerate = async () => {
    setSaving(true)
    setError('')
    try {
      const attribute_values = {}
      attrs.forEach(({ key, values }) => {
        const k = key.trim()
        const vals = values.split(',').map((v) => v.trim()).filter(Boolean)
        if (k && vals.length) attribute_values[k] = vals
      })
      const data = { category, attribute_values, unit, minimum: Number(minimum) || 0 }
      const res = await onGenerate(data)
      setResult(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const isInvalidForm = () => !category || attrs.every(({ key, values }) => !key.trim() || !values.trim())

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
        <div
          className="modal-slide-up w-full max-w-md rounded-t-2xl border border-slate-700 bg-slate-900 p-5 sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <i className="bx bx-check-circle text-5xl text-emerald-400" aria-hidden="true" />
            <h2 className="mt-2 text-lg font-bold text-slate-100">Variantes generadas</h2>
            <p className="mt-1 text-sm text-slate-400">
              <span className="font-bold text-emerald-300">{result.creadas}</span> creadas ·{' '}
              <span className="font-bold text-slate-500">{result.omitidas}</span> omitidas (ya existían)
            </p>
          </div>
          <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300">
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="modal-slide-up w-full max-w-lg rounded-t-2xl border border-slate-700 bg-slate-900 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-bold text-slate-100">Generador de variantes</h2>
        <p className="mb-4 text-xs text-slate-500">
          Define atributos y valores separados por comas. El sistema crea todas las combinaciones automáticamente.
        </p>

        <div className="space-y-3">
          <div className="flex gap-2">
            <select
              value={category} onChange={(e) => setCategory(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
            >
              <option value="">Categoría *</option>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="text" placeholder="Unidad" value={unit} onChange={(e) => setUnit(e.target.value)}
              className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <input
              type="number" placeholder="Mínimo" min="0" value={minimum} onChange={(e) => setMinimum(e.target.value)}
              className="w-24 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-2">
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em] text-slate-500">Atributos</p>
            {attrs.map((attr, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text" placeholder="atributo (ej: metrica)"
                  value={attr.key} onChange={updateAttr(i, 'key')}
                  className="w-36 shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                />
                <input
                  type="text" placeholder="valores separados por coma (ej: M6,M8,M10)"
                  value={attr.values} onChange={updateAttr(i, 'values')}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                />
                {attrs.length > 1 && (
                  <button type="button" onClick={() => removeAttr(i)} aria-label="Eliminar atributo"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-500 transition hover:border-rose-500/50 hover:text-rose-400"
                  >
                    <i className="bx bx-x text-base" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addAttr}
              className="w-full rounded-lg border border-dashed border-slate-700 py-1.5 text-xs text-slate-500 transition hover:border-amber-500/50 hover:text-amber-400"
            >
              + Añadir atributo
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2">
            <span className="text-xs text-slate-500">Total de variantes a generar</span>
            <span className={cx('text-sm font-bold', totalVariants() > 500 ? 'text-rose-400' : 'text-amber-300')}>
              {totalVariants()}
            </span>
          </div>

          {totalVariants() > 500 && (
            <p className="text-xs text-rose-400">Máximo 500 variantes por generación. Divide en varias llamadas.</p>
          )}
          {error && <p className="text-xs font-semibold text-rose-400">{error}</p>}
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-slate-800">
            Cancelar
          </button>
          <button
            type="button" onClick={executeGenerate}
            disabled={saving || isInvalidForm() || totalVariants() > 500}
            className="flex-1 rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
          >
            {saving ? 'Generando...' : `Generar ${totalVariants()} variantes`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────
const StockPage = () => {
  const { materials, isLoading, error, feedback, refresh, handleCreate, handleDelete, handleGenerarVariantes } = useStockPage()
  const { profile } = useAuthSession()
  const isAdmin = profile?.role === 'admin'

  const [showCreate,    setShowCreate]    = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [filterCategory, setFilterCategory] = useState('todos')
  const [filterTone,     setFilterTone]     = useState('todos')

  const filtered = materials.filter((m) => {
    const catOk  = filterCategory === 'todos' || m.category === filterCategory
    const toneOk = filterTone === 'todos' || m.tone === filterTone
    return catOk && toneOk
  })

  const state = { isLoading, error, materials, refresh }

  return (
    <AppShell>
      <div className="space-y-4 pb-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.2em] text-amber-300">
              // stock
            </p>
            <h1 className="font-rajdhani text-2xl font-bold text-slate-100">Materiales</h1>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button
                type="button" onClick={() => setShowGenerator(true)}
                className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-300 transition hover:border-amber-500/40 hover:text-amber-300"
              >
                <i className="bx bx-grid-alt mr-1" aria-hidden="true" />
                Variantes
              </button>
              <button
                type="button" onClick={() => setShowCreate(true)}
                className="rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3 py-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-emerald-300 transition hover:border-emerald-400/70 hover:bg-emerald-500/25"
              >
                + Material
              </button>
            </div>
          )}
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-300">{feedback}</p>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-300 focus:border-amber-400 focus:outline-none"
          >
            <option value="todos">Todas las categorías</option>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterTone} onChange={(e) => setFilterTone(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-300 focus:border-amber-400 focus:outline-none"
          >
            <option value="todos">Todos los estados</option>
            <option value="danger">Crítico</option>
            <option value="warning">Aviso</option>
            <option value="success">Correcto</option>
          </select>
          {(filterCategory !== 'todos' || filterTone !== 'todos') && (
            <button type="button" onClick={() => { setFilterCategory('todos'); setFilterTone('todos') }}
              className="rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-500 transition hover:text-slate-300"
            >
              Limpiar filtros
            </button>
          )}
          <span className="ml-auto self-center text-xs text-slate-500">
            {filtered.length} de {materials.length} materiales
          </span>
        </div>

        {/* Estados */}
        {loadingState(state)}
        {errorState(state)}
        {emptyState(state)}

        {/* Lista */}
        {!isLoading && !error && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((item) => (
              <MaterialRow
                key={item.id}
                item={item}
                isAdmin={isAdmin}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateMaterialModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
      {showGenerator && (
        <VariantGeneratorModal
          onClose={() => setShowGenerator(false)}
          onGenerate={handleGenerarVariantes}
        />
      )}
    </AppShell>
  )
}

export default StockPage
