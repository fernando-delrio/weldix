import { useEffect, useState } from 'react'
import WeldixButton from '../../core/components/WeldixButton'
import { cx } from '../../core/lib/cx'
import { useRrhhLegal } from '../hooks/useRrhhLegal'
import { getStock } from '../../stock/services/stockService'

const cardBase = 'rounded-xl border border-slate-700/60 bg-slate-900/65 p-4'
const inputBase =
  'w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 placeholder:text-slate-600'
const labelBase = 'block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-1'

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'epis', label: 'EPIs', icon: 'bx bx-shield' },
  { id: 'certificados', label: 'Certificados', icon: 'bx bx-award' },
  { id: 'reconocimientos', label: 'Reconoc. médicos', icon: 'bx bx-heart' },
]

// ── Badge de alerta ───────────────────────────────────────────────────────────
const AlertaBadge = ({ dias }) => {
  if (dias === null || dias === undefined) return null
  const color =
    dias <= 0
      ? 'border-rose-700/50 bg-rose-500/10 text-rose-300'
      : dias <= 30
        ? 'border-amber-700/50 bg-amber-500/10 text-amber-300'
        : 'border-emerald-700/50 bg-emerald-500/10 text-emerald-300'
  const label = dias <= 0 ? 'Vencido' : dias <= 30 ? `Caduca en ${dias}d` : `${dias}d restantes`
  return <span className={cx('rounded border px-2 py-0.5 text-xs font-bold', color)}>{label}</span>
}

// ── Estado badge ──────────────────────────────────────────────────────────────
const ESTADO_EPI = {
  activo: 'border-emerald-700/50 bg-emerald-500/10 text-emerald-300',
  repuesto: 'border-amber-700/50 bg-amber-500/10 text-amber-300',
  baja: 'border-slate-700/50 bg-slate-700/20 text-slate-500',
}
const ESTADO_CERT = {
  vigente: 'border-emerald-700/50 bg-emerald-500/10 text-emerald-300',
  vencido: 'border-rose-700/50 bg-rose-500/10 text-rose-300',
  pendiente_renovacion: 'border-amber-700/50 bg-amber-500/10 text-amber-300',
}
const RESULTADO_MED = {
  apto: 'border-emerald-700/50 bg-emerald-500/10 text-emerald-300',
  apto_con_restricciones: 'border-amber-700/50 bg-amber-500/10 text-amber-300',
  no_apto: 'border-rose-700/50 bg-rose-500/10 text-rose-300',
}

// ── Modal: nuevo EPI ──────────────────────────────────────────────────────────
const NuevoEpiModal = ({ tiposEpi, onClose, onSubmit, isSubmitting, error, operarios }) => {
  const [form, setForm] = useState({
    operario_id: operarios[0]?.id ?? '',
    tipo_epi: tiposEpi[0]?.valor ?? '',
    cantidad: 1,
    fecha_entrega: new Date().toISOString().slice(0, 10),
    fecha_caducidad: '',
    descripcion: '',
    talla: '',
    stock_item_id: '', // ítem de stock del que se descuenta
  })
  const [stockItems, setStockItems] = useState([])
  const [loadingStock, setLoadingStock] = useState(true)
  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  useEffect(() => {
    getStock()
      .then(setStockItems)
      .catch(() => setStockItems([]))
      .finally(() => setLoadingStock(false))
  }, [])

  const sinOperarios = operarios.length === 0

  // El ítem de stock seleccionado y su stock disponible
  const stockSeleccionado = stockItems.find((s) => s.id === Number(form.stock_item_id)) ?? null
  const cantidadDisponible = stockSeleccionado?.quantity ?? null
  const stockInsuficiente = stockSeleccionado !== null && Number(form.cantidad) > cantidadDisponible
  const sinStock = stockSeleccionado !== null && cantidadDisponible === 0

  const errorLocal = sinStock
    ? `Sin stock: "${stockSeleccionado.name}" tiene 0 unidades disponibles.`
    : stockInsuficiente
      ? `Stock insuficiente: solo hay ${cantidadDisponible} unidades de "${stockSeleccionado.name}".`
      : null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (sinOperarios || !form.operario_id || errorLocal) return
    onSubmit(
      {
        operario_id: Number(form.operario_id),
        tipo_epi: form.tipo_epi,
        cantidad: Number(form.cantidad),
        fecha_entrega: form.fecha_entrega,
        fecha_caducidad: form.fecha_caducidad || null,
        descripcion: form.descripcion || null,
        talla: form.talla || null,
      },
      form.stock_item_id ? Number(form.stock_item_id) : null
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100">Registrar entrega de EPI</h3>
          <WeldixButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 border border-slate-700"
          >
            ✕
          </WeldixButton>
        </div>
        {sinOperarios ? (
          <p className="rounded-lg border border-amber-700/50 bg-amber-500/10 p-3 text-sm text-amber-300">
            No hay operarios disponibles. Crea al menos un operario antes de registrar EPIs.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className={labelBase}>Operario *</label>
              <select
                value={form.operario_id}
                onChange={set('operario_id')}
                className={inputBase}
                required
              >
                {operarios.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selección de ítem de stock — obligatorio para controlar inventario */}
            <div>
              <label className={labelBase}>
                Ítem de stock *
                <span className="ml-1 normal-case text-slate-600">(el EPI que se entrega)</span>
              </label>
              {loadingStock ? (
                <div className="h-10 animate-pulse rounded-lg bg-slate-800" />
              ) : stockItems.length === 0 ? (
                <p className="rounded-lg border border-rose-700/50 bg-rose-500/10 p-2 text-xs text-rose-300">
                  No hay materiales en stock. Añade el EPI al stock antes de registrar la entrega.
                </p>
              ) : (
                <select
                  value={form.stock_item_id}
                  onChange={set('stock_item_id')}
                  className={inputBase}
                  required
                >
                  <option value="">— Selecciona un ítem —</option>
                  {stockItems.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.quantity === 0}>
                      {s.name} · {s.quantity} {s.unit} {s.quantity === 0 ? '(sin stock)' : ''}
                    </option>
                  ))}
                </select>
              )}
              {/* Indicador visual del stock disponible */}
              {stockSeleccionado && (
                <p
                  className={cx(
                    'mt-1 text-xs font-semibold',
                    sinStock
                      ? 'text-rose-400'
                      : stockInsuficiente
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                  )}
                >
                  Disponible: {cantidadDisponible} {stockSeleccionado.unit}
                </p>
              )}
            </div>

            <div>
              <label className={labelBase}>Tipo de EPI *</label>
              <select value={form.tipo_epi} onChange={set('tipo_epi')} className={inputBase}>
                {tiposEpi.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>Talla</label>
                <input
                  value={form.talla}
                  onChange={set('talla')}
                  className={inputBase}
                  placeholder="M, L, 42…"
                />
              </div>
              <div>
                <label className={labelBase}>Cantidad *</label>
                <input
                  type="number"
                  min={1}
                  max={cantidadDisponible ?? undefined}
                  value={form.cantidad}
                  onChange={set('cantidad')}
                  className={inputBase}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>Fecha entrega *</label>
                <input
                  type="date"
                  value={form.fecha_entrega}
                  onChange={set('fecha_entrega')}
                  className={inputBase}
                  required
                />
              </div>
              <div>
                <label className={labelBase}>Caducidad</label>
                <input
                  type="date"
                  value={form.fecha_caducidad}
                  onChange={set('fecha_caducidad')}
                  className={inputBase}
                />
              </div>
            </div>
            <div>
              <label className={labelBase}>Descripción adicional</label>
              <input
                value={form.descripcion}
                onChange={set('descripcion')}
                className={inputBase}
                placeholder="Guantes nitrilo negro talla M…"
              />
            </div>

            {(errorLocal || error) && (
              <p className="rounded-lg border border-rose-700/50 bg-rose-500/10 p-2 text-xs text-rose-300">
                {errorLocal ?? error}
              </p>
            )}

            <WeldixButton
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              disabled={!!errorLocal || !form.stock_item_id}
              className="w-full"
            >
              Registrar entrega y descontar stock
            </WeldixButton>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Modal: nuevo certificado ──────────────────────────────────────────────────
const NuevoCertModal = ({
  tiposCertificado,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  operarios,
}) => {
  const [form, setForm] = useState({
    operario_id: operarios[0]?.id ?? '',
    tipo: tiposCertificado[0]?.valor ?? '',
    fecha_emision: new Date().toISOString().slice(0, 10),
    fecha_caducidad: '',
    descripcion: '',
    entidad_certificadora: '',
  })
  const [archivo, setArchivo] = useState(null)
  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const sinOperarios = operarios.length === 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (sinOperarios || !form.operario_id) return
    onSubmit(
      {
        operario_id: Number(form.operario_id),
        tipo: form.tipo,
        fecha_emision: form.fecha_emision,
        fecha_caducidad: form.fecha_caducidad || null,
        descripcion: form.descripcion || null,
        entidad_certificadora: form.entidad_certificadora || null,
      },
      archivo
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100">Nuevo certificado</h3>
          <WeldixButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 border border-slate-700"
          >
            ✕
          </WeldixButton>
        </div>
        {sinOperarios ? (
          <p className="rounded-lg border border-amber-700/50 bg-amber-500/10 p-3 text-sm text-amber-300">
            No hay operarios disponibles. Crea al menos un operario antes de registrar certificados.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className={labelBase}>Operario *</label>
              <select
                value={form.operario_id}
                onChange={set('operario_id')}
                className={inputBase}
                required
              >
                {operarios.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelBase}>Tipo *</label>
              <select value={form.tipo} onChange={set('tipo')} className={inputBase}>
                {tiposCertificado.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelBase}>Entidad certificadora</label>
              <input
                value={form.entidad_certificadora}
                onChange={set('entidad_certificadora')}
                className={inputBase}
                placeholder="Bureau Veritas, INEM…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>Fecha emisión *</label>
                <input
                  type="date"
                  value={form.fecha_emision}
                  onChange={set('fecha_emision')}
                  className={inputBase}
                  required
                />
              </div>
              <div>
                <label className={labelBase}>Caducidad</label>
                <input
                  type="date"
                  value={form.fecha_caducidad}
                  onChange={set('fecha_caducidad')}
                  className={inputBase}
                />
              </div>
            </div>
            <div>
              <label className={labelBase}>Adjuntar archivo (PDF / imagen)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-400 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-2 file:py-1 file:text-xs file:text-slate-300"
              />
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <WeldixButton
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full"
            >
              Guardar certificado
            </WeldixButton>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Modal: nuevo reconocimiento médico ────────────────────────────────────────
const NuevoRecoModal = ({ onClose, onSubmit, isSubmitting, error, operarios }) => {
  const [form, setForm] = useState({
    operario_id: operarios[0]?.id ?? '',
    fecha_realizado: new Date().toISOString().slice(0, 10),
    fecha_proximo: '',
    resultado: 'apto',
    restricciones: '',
    observaciones: '',
  })
  const [archivo, setArchivo] = useState(null)
  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const sinOperarios = operarios.length === 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (sinOperarios || !form.operario_id) return
    onSubmit(
      {
        operario_id: Number(form.operario_id),
        fecha_realizado: form.fecha_realizado,
        fecha_proximo: form.fecha_proximo || null,
        resultado: form.resultado,
        restricciones: form.restricciones || null,
        observaciones: form.observaciones || null,
      },
      archivo
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100">Reconocimiento médico</h3>
          <WeldixButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 border border-slate-700"
          >
            ✕
          </WeldixButton>
        </div>
        {sinOperarios ? (
          <p className="rounded-lg border border-amber-700/50 bg-amber-500/10 p-3 text-sm text-amber-300">
            No hay operarios disponibles. Crea al menos un operario antes de registrar
            reconocimientos.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className={labelBase}>Operario *</label>
              <select
                value={form.operario_id}
                onChange={set('operario_id')}
                className={inputBase}
                required
              >
                {operarios.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>Fecha realizado *</label>
                <input
                  type="date"
                  value={form.fecha_realizado}
                  onChange={set('fecha_realizado')}
                  className={inputBase}
                  required
                />
              </div>
              <div>
                <label className={labelBase}>Próximo</label>
                <input
                  type="date"
                  value={form.fecha_proximo}
                  onChange={set('fecha_proximo')}
                  className={inputBase}
                />
              </div>
            </div>
            <div>
              <label className={labelBase}>Resultado *</label>
              <select value={form.resultado} onChange={set('resultado')} className={inputBase}>
                <option value="apto">Apto</option>
                <option value="apto_con_restricciones">Apto con restricciones</option>
                <option value="no_apto">No apto</option>
              </select>
            </div>
            {form.resultado === 'apto_con_restricciones' && (
              <div>
                <label className={labelBase}>Restricciones</label>
                <textarea
                  value={form.restricciones}
                  onChange={set('restricciones')}
                  rows={2}
                  className={cx(inputBase, 'resize-none')}
                  placeholder="Describe las restricciones…"
                />
              </div>
            )}
            <div>
              <label className={labelBase}>Adjuntar informe</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-400 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-2 file:py-1 file:text-xs file:text-slate-300"
              />
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <WeldixButton
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full"
            >
              Guardar reconocimiento
            </WeldixButton>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
const LegalPrevencionSection = ({ isAdmin, operarios = [] }) => {
  const [tab, setTab] = useState('epis')
  const [modal, setModal] = useState(null)

  const {
    epis,
    certificados,
    reconocimientos,
    tiposEpi,
    tiposCertificado,
    episConAlerta,
    certsConAlerta,
    isLoading,
    isSubmitting,
    error,
    registrarEpi,
    cambiarEstadoEpi,
    borrarEpi,
    registrarCertificado,
    registrarReconocimiento,
  } = useRrhhLegal()

  const totalAlertas = episConAlerta.length + certsConAlerta.length

  const handleRegistrarEpi = async (data, stockItemId) => {
    try {
      await registrarEpi(data, stockItemId)
      setModal(null)
    } catch {
      // el error ya queda en el hook, el modal sigue abierto mostrándolo
    }
  }

  const handleRegistrarCert = async (data, archivo) => {
    await registrarCertificado(data, archivo)
    setModal(null)
  }

  const handleRegistrarReco = async (data, archivo) => {
    await registrarReconocimiento(data, archivo)
    setModal(null)
  }

  const loadingState = isLoading && (
    <div className="space-y-2">
      {[1, 2, 3].map((n) => (
        <div key={n} className={cx(cardBase, 'h-16 animate-pulse')} />
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-100">
          <i className="bx bx-shield-quarter text-sky-400" aria-hidden="true" />
          Legal y Prevención
          {totalAlertas > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
              {totalAlertas} alerta{totalAlertas !== 1 ? 's' : ''}
            </span>
          )}
        </h2>
        {isAdmin && (
          <WeldixButton variant="secondary" size="sm" onClick={() => setModal(tab)}>
            + Nuevo
          </WeldixButton>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cx(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest transition',
              tab === t.id
                ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                : 'border-slate-700 bg-slate-800/40 text-slate-500 hover:border-slate-600 hover:text-slate-400'
            )}
          >
            <i className={t.icon} aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      {loadingState}

      {/* EPIs */}
      {!isLoading && tab === 'epis' && (
        <div className="space-y-2">
          {epis.length === 0 && (
            <div className={cx(cardBase, 'py-6 text-center text-sm text-slate-500')}>
              No hay EPIs registrados.
            </div>
          )}
          {epis.map((epi) => (
            <div key={epi.id} className={cx(cardBase, 'flex items-start justify-between gap-3')}>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-100">{epi.tipo_epi_label}</p>
                {epi.operario_nombre && (
                  <p className="text-xs text-slate-500">{epi.operario_nombre}</p>
                )}
                <p className="mt-0.5 text-xs text-slate-400">
                  Entrega: {epi.fecha_entrega}
                  {epi.talla && ` · Talla ${epi.talla}`}
                  {epi.cantidad > 1 && ` · ×${epi.cantidad}`}
                </p>
                {epi.fecha_caducidad && (
                  <div className="mt-1">
                    <AlertaBadge dias={epi.dias_para_caducar} />
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span
                  className={cx(
                    'rounded border px-2 py-0.5 text-xs font-bold uppercase',
                    ESTADO_EPI[epi.estado] ?? ESTADO_EPI.activo
                  )}
                >
                  {epi.estado}
                </span>
                {isAdmin && (
                  <div className="flex gap-1.5">
                    {epi.estado === 'activo' && (
                      <WeldixButton
                        variant="ghost"
                        size="sm"
                        onClick={() => cambiarEstadoEpi(epi.id, 'repuesto')}
                      >
                        Reponer
                      </WeldixButton>
                    )}
                    <WeldixButton
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Eliminar este registro de ${epi.tipo_epi_label}? Esta acción no se puede deshacer.`
                          )
                        ) {
                          borrarEpi(epi.id)
                        }
                      }}
                      aria-label={`Eliminar EPI ${epi.tipo_epi_label}`}
                    >
                      <i className="bx bx-trash" aria-hidden="true" />
                    </WeldixButton>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certificados */}
      {!isLoading && tab === 'certificados' && (
        <div className="space-y-2">
          {certificados.length === 0 && (
            <div className={cx(cardBase, 'py-6 text-center text-sm text-slate-500')}>
              No hay certificados registrados.
            </div>
          )}
          {certificados.map((cert) => (
            <div key={cert.id} className={cx(cardBase, 'flex items-start justify-between gap-3')}>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-100">{cert.tipo_label}</p>
                {cert.operario_nombre && (
                  <p className="text-xs text-slate-500">{cert.operario_nombre}</p>
                )}
                {cert.entidad_certificadora && (
                  <p className="text-xs text-slate-400">{cert.entidad_certificadora}</p>
                )}
                <p className="mt-0.5 text-xs text-slate-400">Emisión: {cert.fecha_emision}</p>
                {cert.fecha_caducidad && (
                  <div className="mt-1">
                    <AlertaBadge dias={cert.dias_para_caducar} />
                  </div>
                )}
              </div>
              <span
                className={cx(
                  'shrink-0 rounded border px-2 py-0.5 text-xs font-bold uppercase',
                  ESTADO_CERT[cert.estado] ?? ESTADO_CERT.vigente
                )}
              >
                {cert.estado}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Reconocimientos */}
      {!isLoading && tab === 'reconocimientos' && (
        <div className="space-y-2">
          {reconocimientos.length === 0 && (
            <div className={cx(cardBase, 'py-6 text-center text-sm text-slate-500')}>
              No hay reconocimientos registrados.
            </div>
          )}
          {reconocimientos.map((rec) => (
            <div key={rec.id} className={cx(cardBase, 'flex items-start justify-between gap-3')}>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-100">
                  Reconocimiento médico — {rec.fecha_realizado}
                </p>
                {rec.operario_nombre && (
                  <p className="text-xs text-slate-500">{rec.operario_nombre}</p>
                )}
                {rec.restricciones && (
                  <p className="mt-0.5 text-xs text-slate-400 italic">"{rec.restricciones}"</p>
                )}
                {rec.fecha_proximo && (
                  <div className="mt-1">
                    <AlertaBadge dias={rec.dias_para_proximo} />
                  </div>
                )}
              </div>
              <span
                className={cx(
                  'shrink-0 rounded border px-2 py-0.5 text-xs font-bold',
                  RESULTADO_MED[rec.resultado] ?? RESULTADO_MED.apto
                )}
              >
                {rec.resultado.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
      {modal === 'epis' && (
        <NuevoEpiModal
          tiposEpi={tiposEpi}
          operarios={operarios}
          onClose={() => setModal(null)}
          onSubmit={handleRegistrarEpi}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}
      {modal === 'certificados' && (
        <NuevoCertModal
          tiposCertificado={tiposCertificado}
          operarios={operarios}
          onClose={() => setModal(null)}
          onSubmit={handleRegistrarCert}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}
      {modal === 'reconocimientos' && (
        <NuevoRecoModal
          operarios={operarios}
          onClose={() => setModal(null)}
          onSubmit={handleRegistrarReco}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}
    </div>
  )
}

export default LegalPrevencionSection
