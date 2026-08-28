import { useState, useMemo } from 'react'
import AppShell from '../../core/components/AppShell'
import PanelCard from '../../core/components/PanelCard'
import WeldixButton from '../../core/components/WeldixButton'
import PageHeader from '../../core/components/PageHeader'
import EmptyState from '../../core/components/EmptyState'
import { useStockPage } from '../hooks/useStockPage'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { cx } from '../../core/lib/cx'

const CATEGORIAS = ['perfil', 'chapa', 'soldadura', 'tornilleria', 'epi', 'consumible']

const CAT_LABELS = {
  perfil: 'Perfiles',
  chapa: 'Chapas',
  soldadura: 'Soldadura',
  tornilleria: 'Tornillería',
  epi: 'EPI',
  consumible: 'Consumibles',
  __none__: 'Sin categoría',
}

const CAT_ORDER = [...CATEGORIAS, '__none__']

const TONE_BAR = {
  danger: 'bg-rose-400',
  warning: 'bg-amber-400',
  success: 'bg-emerald-400',
  neutral: 'bg-slate-600',
}

const TONE_TEXT = {
  danger: 'text-rose-400',
  warning: 'text-amber-400',
  success: 'text-emerald-400',
  neutral: 'text-slate-500',
}

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none'

// ── Guards ──────────────────────────────────────────────────────────────────
const loadingState = ({ isLoading }) =>
  isLoading && (
    <div className="space-y-1.5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-800/60" />
      ))}
    </div>
  )

const errorState = ({ error, refresh }) =>
  error && (
    <PanelCard className="border-rose-700/40">
      <p className="text-sm font-semibold text-rose-300">{error}</p>
      <WeldixButton variant="danger" size="sm" onClick={refresh} className="mt-3">
        Reintentar
      </WeldixButton>
    </PanelCard>
  )

// ── Fila de material ────────────────────────────────────────────────────────
const MaterialRow = ({
  item,
  isAdmin,
  isRestocking,
  onOpenRestock,
  onCloseRestock,
  onRestock,
  onEdit,
  onDelete,
}) => {
  const [qty, setQty] = useState('')
  const [saving, setSaving] = useState(false)

  const handleConfirmRestock = async () => {
    const n = parseFloat(qty)
    if (!n || n <= 0) return
    setSaving(true)
    try {
      await onRestock(item.id, n)
      setQty('')
      onCloseRestock()
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirmRestock()
    if (e.key === 'Escape') onCloseRestock()
  }

  return (
    <PanelCard className="p-0! overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Nombre + stock */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">
            {item.display_name ?? item.name}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {item.quantity} {item.unit} · mín {item.minimum} {item.unit}
          </p>
        </div>
        {/* Barra progreso (sm+) */}
        <div className="hidden sm:flex items-center gap-2 w-36 shrink-0">
          <div className="flex-1 h-1.5 rounded-full bg-slate-800">
            <div
              className={cx(
                'h-1.5 rounded-full transition-all',
                TONE_BAR[item.tone] ?? TONE_BAR.neutral
              )}
              style={{ width: `${item.level}%` }}
            />
          </div>
          <span
            className={cx(
              'w-9 text-right text-xs font-bold',
              TONE_TEXT[item.tone] ?? TONE_TEXT.neutral
            )}
          >
            {item.level}%
          </span>
        </div>
        {/* Acciones */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={cx('text-xs font-bold sm:hidden', TONE_TEXT[item.tone] ?? TONE_TEXT.neutral)}
          >
            {item.level}%
          </span>
          {isAdmin && (
            <>
              <WeldixButton
                variant={isRestocking ? 'warning' : 'secondary'}
                size="icon"
                onClick={() => (isRestocking ? onCloseRestock() : onOpenRestock(item.id))}
                title="Añadir stock"
                aria-label="Añadir stock"
              >
                <i className="bx bx-plus text-base" aria-hidden="true" />
              </WeldixButton>
              <WeldixButton
                variant="secondary"
                size="icon"
                onClick={() => onEdit(item)}
                title="Editar"
                aria-label="Editar material"
              >
                <i className="bx bx-pencil text-base" aria-hidden="true" />
              </WeldixButton>
              <WeldixButton
                variant="danger"
                size="icon"
                onClick={() => onDelete(item.id)}
                title="Eliminar"
                aria-label="Eliminar material"
              >
                <i className="bx bx-trash text-base" aria-hidden="true" />
              </WeldixButton>
            </>
          )}
        </div>
      </div>

      {/* Barra móvil */}
      <div className="px-3 pb-2 sm:hidden">
        <div className="h-1.5 w-full rounded-full bg-slate-800">
          <div
            className={cx('h-1.5 rounded-full', TONE_BAR[item.tone] ?? TONE_BAR.neutral)}
            style={{ width: `${item.level}%` }}
          />
        </div>
      </div>

      {/* Restock inline */}
      {isRestocking && (
        <div className="flex items-center gap-2 border-t border-slate-800 px-3 py-2">
          <span className="shrink-0 text-xs text-slate-500">Añadir:</span>
          <input
            type="number"
            min="0.01"
            step="any"
            autoFocus
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`0 ${item.unit}`}
            className="w-28 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
          />
          <span className="shrink-0 text-xs text-slate-500">{item.unit}</span>
          <WeldixButton
            variant="success"
            size="sm"
            onClick={handleConfirmRestock}
            disabled={!qty || parseFloat(qty) <= 0}
            isLoading={saving}
            loadingLabel="Registrando…"
          >
            Registrar
          </WeldixButton>
          <WeldixButton variant="ghost" size="sm" onClick={onCloseRestock}>
            Cancelar
          </WeldixButton>
        </div>
      )}
    </PanelCard>
  )
}

// ── Sección de categoría colapsable ─────────────────────────────────────────
const CategorySection = ({
  category,
  items,
  isAdmin,
  restockingId,
  onOpenRestock,
  onCloseRestock,
  onRestock,
  onEdit,
  onDelete,
}) => {
  const [collapsed, setCollapsed] = useState(false)
  const criticals = items.filter((m) => m.tone === 'danger').length
  const warnings = items.filter((m) => m.tone === 'warning').length

  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 py-1 text-left"
      >
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          {CAT_LABELS[category] ?? category}
        </span>
        <span className="text-xs text-slate-600">({items.length})</span>
        {criticals > 0 && (
          <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-xs font-bold text-rose-400">
            {criticals} crítico{criticals > 1 ? 's' : ''}
          </span>
        )}
        {warnings > 0 && (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-bold text-amber-400">
            {warnings} aviso{warnings > 1 ? 's' : ''}
          </span>
        )}
        <div className="ml-1 h-px flex-1 bg-slate-800" />
        <i
          className={cx(
            'bx text-xs text-slate-600',
            collapsed ? 'bx-chevron-right' : 'bx-chevron-down'
          )}
          aria-hidden="true"
        />
      </button>

      {!collapsed && (
        <div className="mt-1 space-y-1.5">
          {items.map((item) => (
            <MaterialRow
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              isRestocking={restockingId === item.id}
              onOpenRestock={onOpenRestock}
              onCloseRestock={onCloseRestock}
              onRestock={onRestock}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modal "Recibir pedido" ───────────────────────────────────────────────────
const BulkRestockModal = ({ materials, onClose, onBulkRestock }) => {
  const [search, setSearch] = useState('')
  const [quantities, setQuantities] = useState({})
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(
    () =>
      materials.filter((m) => {
        if (!search) return true
        const name = (m.display_name ?? m.name).toLowerCase()
        return name.includes(search.toLowerCase())
      }),
    [materials, search]
  )

  const grouped = useMemo(() => {
    const g = {}
    filtered.forEach((m) => {
      const cat = m.category || '__none__'
      if (!g[cat]) g[cat] = []
      g[cat].push(m)
    })
    return g
  }, [filtered])

  const setQty = (id, val) => setQuantities((prev) => ({ ...prev, [id]: val }))

  const entries = Object.entries(quantities)
    .filter(([, v]) => parseFloat(v) > 0)
    .map(([id, v]) => ({ id: Number(id), cantidad: parseFloat(v) }))

  const handleSubmit = async () => {
    if (!entries.length) return
    setSaving(true)
    try {
      await onBulkRestock(entries)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        className="modal-slide-up relative flex w-full max-w-xl flex-col rounded-t-2xl border border-slate-700 bg-slate-900 sm:rounded-2xl"
        style={{ maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="shrink-0 border-b border-slate-800 p-5 pb-3">
          <h2 className="text-lg font-bold text-slate-100">Recibir pedido</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Rellena solo los materiales que han llegado. El resto queda sin cambios.
          </p>
          <div className="relative mt-3">
            <i
              className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Buscar material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-8 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {CAT_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
            <div key={cat}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                {CAT_LABELS[cat]}
              </p>
              <div className="space-y-1">
                {grouped[cat].map((item) => (
                  <PanelCard key={item.id} className="flex items-center gap-3 px-3! py-2!">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-200">
                        {item.display_name ?? item.name}
                      </p>
                      <p className="text-xs text-slate-600">
                        Actual: {item.quantity} {item.unit}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-xs text-slate-500">+</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={quantities[item.id] ?? ''}
                        onChange={(e) => setQty(item.id, e.target.value)}
                        placeholder="0"
                        className="w-20 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-right text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                      />
                      <span className="w-8 text-xs text-slate-500">{item.unit}</span>
                    </div>
                  </PanelCard>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">
              No hay materiales que coincidan.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex gap-2 border-t border-slate-800 p-4">
          <WeldixButton variant="secondary" size="lg" onClick={onClose} className="flex-1">
            Cancelar
          </WeldixButton>
          <WeldixButton
            variant="success"
            size="lg"
            onClick={handleSubmit}
            disabled={!entries.length}
            isLoading={saving}
            loadingLabel="Registrando…"
            className="flex-1 bg-emerald-500 text-white hover:bg-emerald-400"
          >
            {entries.length
              ? `Registrar ${entries.length} entrada${entries.length !== 1 ? 's' : ''}`
              : 'Rellena cantidades'}
          </WeldixButton>
        </div>
      </div>
    </div>
  )
}

// ── Modal editar material ───────────────────────────────────────────────────
const CAT_ICONS = {
  perfil: 'bx-git-branch',
  chapa: 'bx-layer',
  soldadura: 'bx-flame',
  tornilleria: 'bx-cog',
  epi: 'bx-shield',
  consumible: 'bx-droplet',
  '': 'bx-box',
}

const EditMaterialModal = ({ item, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: item.name,
    category: item.category ?? '',
    minimum: String(item.minimum),
    unit: item.unit,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setSaving(true)
    try {
      await onSave(item.id, {
        name: form.name.trim(),
        category: form.category || null,
        minimum: Number(form.minimum) || 0,
        unit: form.unit || 'ud',
      })
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="modal-slide-up w-full max-w-md overflow-hidden rounded-t-2xl border border-slate-700/80 bg-slate-900 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de categoría coloreada */}
        <div
          className={cx(
            'h-1 w-full',
            form.category === 'perfil'
              ? 'bg-sky-500'
              : form.category === 'chapa'
                ? 'bg-violet-500'
                : form.category === 'soldadura'
                  ? 'bg-orange-500'
                  : form.category === 'tornilleria'
                    ? 'bg-slate-400'
                    : form.category === 'epi'
                      ? 'bg-emerald-500'
                      : form.category === 'consumible'
                        ? 'bg-amber-500'
                        : 'bg-slate-700'
          )}
        />

        <div className="p-5">
          {/* Cabecera */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800">
              <i
                className={cx('bx text-lg text-slate-400', CAT_ICONS[form.category] ?? 'bx-box')}
                aria-hidden="true"
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Editar material</h2>
              <p className="text-xs text-slate-500 truncate max-w-[240px]">
                {item.display_name ?? item.name}
              </p>
            </div>
            <WeldixButton
              variant="secondary"
              size="icon"
              onClick={onClose}
              aria-label="Cerrar"
              className="ml-auto"
            >
              <i className="bx bx-x text-lg" aria-hidden="true" />
            </WeldixButton>
          </div>

          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Nombre
              </label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                autoFocus
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400/70 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Categoría
              </label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={set('category')}
                  className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 pr-9 text-sm text-slate-100 focus:border-amber-400/70 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                >
                  <option value="">Sin categoría</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {CAT_LABELS[c]}
                    </option>
                  ))}
                </select>
                <i
                  className="bx bx-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Mínimo + Unidad */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Stock mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.minimum}
                  onChange={set('minimum')}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400/70 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Unidad
                </label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={set('unit')}
                  placeholder="ud, kg, m…"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400/70 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                />
              </div>
            </div>

            {error && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                <i className="bx bx-error-circle" aria-hidden="true" />
                {error}
              </p>
            )}
          </div>

          <div className="mt-5 flex gap-2">
            <WeldixButton variant="secondary" size="lg" onClick={onClose} className="flex-1">
              Cancelar
            </WeldixButton>
            <WeldixButton
              variant="warning"
              size="lg"
              onClick={handleSave}
              isLoading={saving}
              loadingLabel="Guardando…"
              className="flex-1 bg-amber-500 text-slate-950 hover:bg-amber-400"
            >
              Guardar cambios
            </WeldixButton>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal Albarán IA ────────────────────────────────────────────────────────
const CONFIDENCE_STYLE = {
  alta: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Alta' },
  media: { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'Media' },
  baja: { cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30', label: 'Baja' },
}

const AlbaranModal = ({ materials, onClose, onBulkRestock, onParseAlbaran }) => {
  const [step, setStep] = useState('input') // 'input' | 'loading' | 'review'
  const [texto, setTexto] = useState('')
  const [results, setResults] = useState([])
  const [editedQtys, setEditedQtys] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const materialMap = useMemo(() => {
    const m = {}
    materials.forEach((mat) => {
      m[mat.id] = mat
    })
    return m
  }, [materials])

  const handleAnalyze = async () => {
    if (!texto.trim()) return
    setStep('loading')
    setError('')
    try {
      const data = await onParseAlbaran(texto)
      if (!data.length) {
        setError(
          'No se reconoció ningún material del catálogo en este texto. Prueba con más detalle.'
        )
        setStep('input')
        return
      }
      const initial = {}
      data.forEach((r) => {
        initial[r.material_id] = String(r.cantidad)
      })
      setEditedQtys(initial)
      setResults(data)
      setStep('review')
    } catch (e) {
      setError(e.message)
      setStep('input')
    }
  }

  const handleConfirm = async () => {
    const entries = results
      .map((r) => ({
        id: r.material_id,
        cantidad: parseFloat(editedQtys[r.material_id] ?? r.cantidad),
      }))
      .filter((e) => e.cantidad > 0)
    if (!entries.length) return
    setSaving(true)
    try {
      await onBulkRestock(entries)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const activeEntries = results.filter(
    (r) => parseFloat(editedQtys[r.material_id] ?? r.cantidad) > 0
  ).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={step !== 'loading' ? onClose : undefined}
    >
      <div
        className="modal-slide-up relative w-full max-w-xl overflow-hidden rounded-t-2xl border border-slate-700/80 bg-slate-900 shadow-2xl sm:rounded-2xl"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Franja IA ámbar */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400" />

        {/* ── Loading ── */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-6">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10">
              <span className="absolute inset-0 animate-ping rounded-2xl bg-amber-500/15" />
              <i className="bx bx-bot relative text-3xl text-amber-400" aria-hidden="true" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-100">Analizando el albarán…</p>
              <p className="mt-1 text-sm text-slate-500">La IA está identificando los materiales</p>
            </div>
          </div>
        )}

        {/* ── Input ── */}
        {step === 'input' && (
          <>
            <div className="border-b border-slate-800 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
                  <i className="bx bx-bot text-xl text-amber-400" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">Albarán con IA</h2>
                  <p className="text-xs text-slate-500">
                    Pega el texto y la IA identifica los materiales
                  </p>
                </div>
                <WeldixButton
                  variant="secondary"
                  size="icon"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="ml-auto"
                >
                  <i className="bx bx-x text-lg" aria-hidden="true" />
                </WeldixButton>
              </div>
            </div>
            <div className="p-5">
              <textarea
                rows={9}
                autoFocus
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={`Pega aquí el texto del albarán o la nota de entrega. Ejemplo:\n\n  4 bobinas hilo MIG 0.8mm\n  2 bombonas argón 99.9%\n  50 discos de corte 230mm\n  20 paquetes tornillos M8×60`}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800/60 p-3.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-amber-400/70 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
              />
              {error && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                  <i className="bx bx-error-circle" aria-hidden="true" />
                  {error}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <WeldixButton variant="secondary" size="lg" onClick={onClose} className="flex-1">
                  Cancelar
                </WeldixButton>
                <WeldixButton
                  variant="warning"
                  size="lg"
                  onClick={handleAnalyze}
                  disabled={!texto.trim()}
                  className="flex-1 bg-amber-500 text-slate-950 hover:bg-amber-400"
                >
                  <i className="bx bx-bot" aria-hidden="true" />
                  Analizar con IA
                </WeldixButton>
              </div>
            </div>
          </>
        )}

        {/* ── Review ── */}
        {step === 'review' && (
          <>
            <div className="shrink-0 border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <i className="bx bx-check-circle text-lg text-emerald-400" aria-hidden="true" />
                <h2 className="text-base font-bold text-slate-100">Materiales detectados</h2>
                <span className="ml-auto rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                  {results.length} línea{results.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Revisa las cantidades antes de registrar
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: '50vh' }}>
              <div className="space-y-2">
                {results.map((r) => {
                  const mat = materialMap[r.material_id]
                  const conf = CONFIDENCE_STYLE[r.confianza] ?? CONFIDENCE_STYLE.media
                  return (
                    <PanelCard key={r.material_id} className="p-3!">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-100">
                              {mat?.display_name ?? mat?.name ?? r.name}
                            </p>
                            <span
                              className={cx(
                                'rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                conf.cls
                              )}
                            >
                              {conf.label}
                            </span>
                          </div>
                          {r.linea_albaran && (
                            <p className="mt-0.5 truncate text-xs text-slate-600 italic">
                              "{r.linea_albaran}"
                            </p>
                          )}
                          {mat && (
                            <p className="mt-0.5 text-xs text-slate-600">
                              Stock actual: {mat.quantity} {mat.unit}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-400">+</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={editedQtys[r.material_id] ?? r.cantidad}
                            onChange={(e) =>
                              setEditedQtys((prev) => ({
                                ...prev,
                                [r.material_id]: e.target.value,
                              }))
                            }
                            className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-right text-sm font-bold text-emerald-300 focus:border-amber-400 focus:outline-none"
                          />
                          <span className="w-8 text-xs text-slate-500">{mat?.unit ?? ''}</span>
                        </div>
                      </div>
                    </PanelCard>
                  )
                })}
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-800 p-4">
              <div className="flex gap-2">
                <WeldixButton
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    setStep('input')
                    setError('')
                  }}
                >
                  <i className="bx bx-left-arrow-alt" aria-hidden="true" />
                  Volver
                </WeldixButton>
                <WeldixButton
                  variant="success"
                  size="lg"
                  onClick={handleConfirm}
                  disabled={activeEntries === 0}
                  isLoading={saving}
                  loadingLabel="Registrando…"
                  className="flex-1 bg-emerald-500 text-white hover:bg-emerald-400"
                >
                  {`Confirmar ${activeEntries} entrada${activeEntries !== 1 ? 's' : ''}`}
                </WeldixButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Modal crear material ─────────────────────────────────────────────────────
const CreateMaterialModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({
    name: '',
    category: '',
    quantity: '',
    minimum: '',
    unit: 'ud',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const validationError = () => {
    if (!form.name.trim()) return 'El nombre es obligatorio'
    if (form.quantity !== '' && (isNaN(Number(form.quantity)) || Number(form.quantity) < 0))
      return 'Cantidad inválida'
    if (form.minimum !== '' && (isNaN(Number(form.minimum)) || Number(form.minimum) < 0))
      return 'Mínimo inválido'
    return null
  }

  const handleSave = async () => {
    const err = validationError()
    if (err) {
      setError(err)
      return
    }
    setSaving(true)
    try {
      await onSave({
        name: form.name.trim(),
        category: form.category || null,
        quantity: form.quantity !== '' ? Number(form.quantity) : 0,
        minimum: form.minimum !== '' ? Number(form.minimum) : 0,
        unit: form.unit || 'ud',
      })
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="modal-slide-up w-full max-w-lg rounded-t-2xl border border-slate-700 bg-slate-900 p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-slate-100">Nuevo material</h2>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Nombre *"
            value={form.name}
            onChange={set('name')}
            className={inputCls}
          />
          <select value={form.category} onChange={set('category')} className={inputCls}>
            <option value="">Sin categoría</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {CAT_LABELS[c]}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Cantidad"
              min="0"
              value={form.quantity}
              onChange={set('quantity')}
              className={inputCls}
            />
            <input
              type="number"
              placeholder="Mínimo"
              min="0"
              value={form.minimum}
              onChange={set('minimum')}
              className={inputCls}
            />
            <input
              type="text"
              placeholder="Unidad"
              value={form.unit}
              onChange={set('unit')}
              className={inputCls}
            />
          </div>
          {error && <p className="text-xs font-semibold text-rose-400">{error}</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <WeldixButton variant="secondary" size="lg" onClick={onClose} className="flex-1">
            Cancelar
          </WeldixButton>
          <WeldixButton
            variant="warning"
            size="lg"
            onClick={handleSave}
            isLoading={saving}
            loadingLabel="Guardando…"
            className="flex-1 bg-amber-500 text-slate-950 hover:bg-amber-400"
          >
            Crear
          </WeldixButton>
        </div>
      </div>
    </div>
  )
}

// ── Modal generador de variantes ─────────────────────────────────────────────
const VariantGeneratorModal = ({ onClose, onGenerate }) => {
  const [category, setCategory] = useState('')
  const [unit, setUnit] = useState('ud')
  const [minimum, setMinimum] = useState('0')
  const [attrs, setAttrs] = useState([{ key: '', values: '' }])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  const addAttr = () => setAttrs((a) => [...a, { key: '', values: '' }])
  const removeAttr = (i) => setAttrs((a) => a.filter((_, idx) => idx !== i))
  const updateAttr = (i, field) => (e) =>
    setAttrs((a) => a.map((attr, idx) => (idx === i ? { ...attr, [field]: e.target.value } : attr)))

  const totalVariants = () => {
    try {
      return attrs.reduce((acc, { values }) => {
        const count = values
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean).length
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
        const vals = values
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
        if (k && vals.length) attribute_values[k] = vals
      })
      const res = await onGenerate({
        category,
        attribute_values,
        unit,
        minimum: Number(minimum) || 0,
      })
      setResult(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const isInvalidForm = () =>
    !category || attrs.every(({ key, values }) => !key.trim() || !values.trim())

  if (result) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
        onClick={onClose}
      >
        <div
          className="modal-slide-up w-full max-w-md rounded-t-2xl border border-slate-700 bg-slate-900 p-5 sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <i className="bx bx-check-circle text-5xl text-emerald-400" aria-hidden="true" />
            <h2 className="mt-2 text-lg font-bold text-slate-100">Variantes generadas</h2>
            <p className="mt-1 text-sm text-slate-400">
              <span className="font-bold text-emerald-300">{result.creadas}</span> creadas ·{' '}
              <span className="font-bold text-slate-500">{result.omitidas}</span> omitidas
            </p>
          </div>
          <WeldixButton
            variant="warning"
            size="lg"
            onClick={onClose}
            className="mt-5 w-full bg-amber-500 text-slate-950 hover:bg-amber-400"
          >
            Cerrar
          </WeldixButton>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="modal-slide-up w-full max-w-lg rounded-t-2xl border border-slate-700 bg-slate-900 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-bold text-slate-100">Generador de variantes</h2>
        <p className="mb-4 text-xs text-slate-500">
          Define atributos y valores separados por comas. El sistema crea todas las combinaciones.
        </p>
        <div className="space-y-3">
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
            >
              <option value="">Categoría *</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {CAT_LABELS[c]}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Unidad"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Mínimo"
              min="0"
              value={minimum}
              onChange={(e) => setMinimum(e.target.value)}
              className="w-24 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
          <PanelCard className="space-y-2 p-3!">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Atributos
            </p>
            {attrs.map((attr, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  placeholder="atributo (ej: metrica)"
                  value={attr.key}
                  onChange={updateAttr(i, 'key')}
                  className="w-36 shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="valores por coma (ej: M6,M8,M10)"
                  value={attr.values}
                  onChange={updateAttr(i, 'values')}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                />
                {attrs.length > 1 && (
                  <WeldixButton
                    variant="danger"
                    size="icon"
                    onClick={() => removeAttr(i)}
                    aria-label="Quitar atributo"
                    className="shrink-0"
                  >
                    <i className="bx bx-x text-base" aria-hidden="true" />
                  </WeldixButton>
                )}
              </div>
            ))}
            <WeldixButton
              variant="secondary"
              size="sm"
              onClick={addAttr}
              className="w-full border-dashed"
            >
              + Añadir atributo
            </WeldixButton>
          </PanelCard>
          <PanelCard className="flex items-center justify-between px-3! py-2!">
            <span className="text-xs text-slate-500">Total de variantes</span>
            <span
              className={cx(
                'text-sm font-bold',
                totalVariants() > 500 ? 'text-rose-400' : 'text-amber-300'
              )}
            >
              {totalVariants()}
            </span>
          </PanelCard>
          {totalVariants() > 500 && (
            <p className="text-xs text-rose-400">Máximo 500 por generación.</p>
          )}
          {error && <p className="text-xs font-semibold text-rose-400">{error}</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <WeldixButton variant="secondary" size="lg" onClick={onClose} className="flex-1">
            Cancelar
          </WeldixButton>
          <WeldixButton
            variant="warning"
            size="lg"
            onClick={executeGenerate}
            disabled={isInvalidForm() || totalVariants() > 500}
            isLoading={saving}
            loadingLabel="Generando…"
            className="flex-1 bg-amber-500 text-slate-950 hover:bg-amber-400"
          >
            {`Generar ${totalVariants()} variantes`}
          </WeldixButton>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────
const StockPage = () => {
  const {
    materials,
    isLoading,
    error,
    feedback,
    refresh,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleRestock,
    handleBulkRestock,
    handleGenerarVariantes,
    handleParseAlbaran,
  } = useStockPage()
  const { profile } = useAuthSession()
  const isAdmin = profile?.role === 'admin'

  const [search, setSearch] = useState('')
  const [filterTone, setFilterTone] = useState('todos')
  const [restockingId, setRestockingId] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [showBulkRestock, setShowBulkRestock] = useState(false)
  const [showAlbaran, setShowAlbaran] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)

  const filtered = useMemo(
    () =>
      materials.filter((m) => {
        const name = (m.display_name ?? m.name).toLowerCase()
        const matchSearch = !search || name.includes(search.toLowerCase())
        const matchTone = filterTone === 'todos' || m.tone === filterTone
        return matchSearch && matchTone
      }),
    [materials, search, filterTone]
  )

  const grouped = useMemo(() => {
    const g = {}
    filtered.forEach((m) => {
      const cat = m.category || '__none__'
      if (!g[cat]) g[cat] = []
      g[cat].push(m)
    })
    return g
  }, [filtered])

  const categoriesPresent = CAT_ORDER.filter((cat) => grouped[cat]?.length)

  return (
    <AppShell>
      <div className="space-y-4 pb-6">
        <PageHeader
          label="Stock"
          title="Materiales"
          action={
            isAdmin && (
              <div className="flex flex-wrap justify-end gap-2">
                <WeldixButton variant="warning" size="sm" onClick={() => setShowAlbaran(true)}>
                  <i className="bx bx-bot" aria-hidden="true" />
                  Albarán IA
                </WeldixButton>
                <WeldixButton variant="success" size="sm" onClick={() => setShowBulkRestock(true)}>
                  <i className="bx bx-package" aria-hidden="true" />
                  Recibir pedido
                </WeldixButton>
                <WeldixButton variant="secondary" size="sm" onClick={() => setShowGenerator(true)}>
                  <i className="bx bx-grid-alt" aria-hidden="true" />
                  Variantes
                </WeldixButton>
                <WeldixButton variant="secondary" size="sm" onClick={() => setShowCreate(true)}>
                  + Material
                </WeldixButton>
              </div>
            )
          }
        />

        {/* Feedback */}
        {feedback && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
            <p className="text-sm font-semibold text-emerald-300">{feedback}</p>
          </div>
        )}

        {/* Barra de herramientas */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <i
              className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Buscar material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/60 py-2 pl-8 pr-3 text-sm text-slate-300 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
            />
          </div>
          <select
            value={filterTone}
            onChange={(e) => setFilterTone(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-slate-300 focus:border-amber-400 focus:outline-none"
          >
            <option value="todos">Todos los estados</option>
            <option value="danger">Crítico</option>
            <option value="warning">Aviso</option>
            <option value="success">Correcto</option>
          </select>
          <span className="shrink-0 text-xs text-slate-600">{filtered.length} materiales</span>
        </div>

        {/* Guards */}
        {loadingState({ isLoading })}
        {errorState({ error, refresh })}

        {/* Lista agrupada */}
        {!isLoading &&
          !error &&
          (filtered.length === 0 ? (
            <EmptyState
              icon="bx-package"
              title={search ? 'Sin resultados' : 'Sin materiales'}
              description={
                search
                  ? `No hay materiales que coincidan con "${search}".`
                  : 'Añade el primer material desde el botón "+ Material".'
              }
            />
          ) : (
            <div className="space-y-5">
              {categoriesPresent.map((cat) => (
                <CategorySection
                  key={cat}
                  category={cat}
                  items={grouped[cat]}
                  isAdmin={isAdmin}
                  restockingId={restockingId}
                  onOpenRestock={setRestockingId}
                  onCloseRestock={() => setRestockingId(null)}
                  onRestock={handleRestock}
                  onEdit={setEditingItem}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ))}
      </div>

      {/* Modales */}
      {showAlbaran && (
        <AlbaranModal
          materials={materials}
          onClose={() => setShowAlbaran(false)}
          onBulkRestock={handleBulkRestock}
          onParseAlbaran={handleParseAlbaran}
        />
      )}
      {showBulkRestock && (
        <BulkRestockModal
          materials={materials}
          onClose={() => setShowBulkRestock(false)}
          onBulkRestock={handleBulkRestock}
        />
      )}
      {editingItem && (
        <EditMaterialModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleUpdate}
        />
      )}
      {showCreate && (
        <CreateMaterialModal onClose={() => setShowCreate(false)} onSave={handleCreate} />
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
