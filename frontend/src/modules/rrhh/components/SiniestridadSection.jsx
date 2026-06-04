import { useState } from 'react'
import WeldixButton from '../../core/components/WeldixButton'
import { cx } from '../../core/lib/cx'
import { useRrhhSiniestralidad } from '../hooks/useRrhhSiniestralidad'

const cardBase = 'rounded-xl border border-slate-700/60 bg-slate-900/65 p-4'
const inputBase =
  'w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 placeholder:text-slate-600'
const labelBase = 'block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-1'

const TABS = [
  { id: 'accidentes', label: 'Accidentes/incidentes', icon: 'bx bx-error-circle' },
  { id: 'permisos', label: 'Permisos especiales', icon: 'bx bx-file' },
  { id: 'indices', label: 'Índices', icon: 'bx bx-bar-chart-alt-2' },
]

const ESTADO_ACCIDENTE = {
  abierto: 'border-rose-700/50 bg-rose-500/10 text-rose-300',
  en_investigacion: 'border-amber-700/50 bg-amber-500/10 text-amber-300',
  cerrado: 'border-slate-700/50 bg-slate-700/20 text-slate-500',
}
const TIPO_ACCIDENTE = {
  accidente: { label: 'Accidente', color: 'text-rose-400' },
  incidente: { label: 'Incidente', color: 'text-amber-400' },
  casi_accidente: { label: 'Near miss', color: 'text-sky-400' },
}

const ESTADO_PERMISO = {
  activo: 'border-emerald-700/50 bg-emerald-500/10 text-emerald-300',
  vencido: 'border-rose-700/50 bg-rose-500/10 text-rose-300',
  revocado: 'border-slate-700/50 bg-slate-700/20 text-slate-500',
}

const AlertaBadge = ({ dias }) => {
  if (dias === null || dias === undefined) return null
  const color =
    dias <= 0
      ? 'border-rose-700/50 bg-rose-500/10 text-rose-300'
      : dias <= 30
        ? 'border-amber-700/50 bg-amber-500/10 text-amber-300'
        : 'border-emerald-700/50 bg-emerald-500/10 text-emerald-300'
  const label = dias <= 0 ? 'Vencido' : `Caduca en ${dias}d`
  return <span className={cx('rounded border px-2 py-0.5 text-xs font-bold', color)}>{label}</span>
}

// ── Modal: reportar accidente ─────────────────────────────────────────────────
const NuevoAccidenteModal = ({ onClose, onSubmit, isSubmitting, error, operarios }) => {
  const now = new Date()
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const [form, setForm] = useState({
    afectado_id: operarios[0]?.id ?? '',
    fecha_hora: nowStr,
    tipo: 'accidente',
    lugar: '',
    descripcion: '',
    causa_raiz: '',
    dias_baja: 0,
    requiere_hospitalizacion: false,
  })
  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))
  const setCheck = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.checked }))

  const sinOperarios = operarios.length === 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (sinOperarios || !form.afectado_id) return
    onSubmit({
      afectado_id: Number(form.afectado_id),
      fecha_hora: new Date(form.fecha_hora).toISOString(),
      tipo: form.tipo,
      lugar: form.lugar || null,
      descripcion: form.descripcion,
      causa_raiz: form.causa_raiz || null,
      dias_baja: Number(form.dias_baja),
      requiere_hospitalizacion: form.requiere_hospitalizacion,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100">Reportar accidente / incidente</h3>
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
            No hay operarios disponibles. Crea al menos un operario antes de registrar accidentes.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className={labelBase}>Afectado *</label>
              <select
                value={form.afectado_id}
                onChange={set('afectado_id')}
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
                <option value="accidente">Accidente</option>
                <option value="incidente">Incidente</option>
                <option value="casi_accidente">Near miss (casi accidente)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>Fecha y hora *</label>
                <input
                  type="datetime-local"
                  value={form.fecha_hora}
                  onChange={set('fecha_hora')}
                  className={inputBase}
                  required
                />
              </div>
              <div>
                <label className={labelBase}>Lugar</label>
                <input
                  value={form.lugar}
                  onChange={set('lugar')}
                  className={inputBase}
                  placeholder="Zona de soldadura…"
                />
              </div>
            </div>
            <div>
              <label className={labelBase}>Descripción * (mín. 10 caracteres)</label>
              <textarea
                value={form.descripcion}
                onChange={set('descripcion')}
                rows={3}
                minLength={10}
                required
                className={cx(inputBase, 'resize-none')}
                placeholder="Describe qué ocurrió…"
              />
            </div>
            <div>
              <label className={labelBase}>Causa raíz</label>
              <input
                value={form.causa_raiz}
                onChange={set('causa_raiz')}
                className={inputBase}
                placeholder="Fallo en EPI, procedimiento, etc."
              />
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className={labelBase}>Días de baja</label>
                <input
                  type="number"
                  min={0}
                  value={form.dias_baja}
                  onChange={set('dias_baja')}
                  className={inputBase}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={form.requiere_hospitalizacion}
                  onChange={setCheck('requiere_hospitalizacion')}
                  className="h-4 w-4 rounded accent-sky-500"
                />
                <span className="text-xs text-slate-400">Requiere hospitalización</span>
              </label>
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <WeldixButton
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full"
            >
              Registrar
            </WeldixButton>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Modal: nuevo permiso especial ─────────────────────────────────────────────
const NuevoPermisoModal = ({ onClose, onSubmit, isSubmitting, error, operarios }) => {
  const [form, setForm] = useState({
    operario_id: operarios[0]?.id ?? '',
    tipo: 'alturas',
    fecha_emision: new Date().toISOString().slice(0, 10),
    fecha_caducidad: '',
    descripcion_trabajo: '',
  })
  const [archivo, setArchivo] = useState(null)
  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const TIPOS_PERMISO = [
    { valor: 'alturas', label: 'Trabajo en altura' },
    { valor: 'espacios_confinados', label: 'Espacio confinado' },
    { valor: 'trabajos_caliente', label: 'Trabajos en caliente' },
    { valor: 'electrico', label: 'Trabajo eléctrico' },
    { valor: 'excavacion', label: 'Excavación / demolición' },
    { valor: 'otro', label: 'Otro' },
  ]

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
        descripcion_trabajo: form.descripcion_trabajo || null,
      },
      archivo
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100">Nuevo permiso especial</h3>
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
            No hay operarios disponibles. Crea al menos un operario antes de registrar permisos.
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
              <label className={labelBase}>Tipo de trabajo *</label>
              <select value={form.tipo} onChange={set('tipo')} className={inputBase}>
                {TIPOS_PERMISO.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.label}
                  </option>
                ))}
              </select>
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
              <label className={labelBase}>Descripción del trabajo</label>
              <textarea
                value={form.descripcion_trabajo}
                onChange={set('descripcion_trabajo')}
                rows={2}
                className={cx(inputBase, 'resize-none')}
                placeholder="Soldadura en cubierta a 8m de altura…"
              />
            </div>
            <div>
              <label className={labelBase}>Adjuntar permiso firmado (PDF)</label>
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
              Crear permiso
            </WeldixButton>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Métricas índices ──────────────────────────────────────────────────────────
const IndicesMetrica = ({ label, value, color = 'text-slate-100' }) => (
  <div className={cx(cardBase, 'text-center')}>
    <p className={cx('text-2xl font-bold', color)}>{value}</p>
    <p className="text-xs uppercase tracking-wider text-slate-500 mt-1">{label}</p>
  </div>
)

// ── Componente principal ──────────────────────────────────────────────────────
const SiniestridadSection = ({ isAdmin, operarios = [] }) => {
  const [tab, setTab] = useState('accidentes')
  const [modal, setModal] = useState(null)

  const {
    accidentes,
    permisos,
    indices,
    accidentesAbiertos,
    permisosConAlerta,
    yearIndices,
    setYearIndices,
    isLoading,
    isSubmitting,
    error,
    reportarAccidente,
    registrarPermiso,
  } = useRrhhSiniestralidad()

  const totalAlertas = accidentesAbiertos.length + permisosConAlerta.length

  const handleReportarAccidente = async (data) => {
    await reportarAccidente(data)
    setModal(null)
  }

  const handleRegistrarPermiso = async (data, archivo) => {
    await registrarPermiso(data, archivo)
    setModal(null)
  }

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-100">
          <i className="bx bx-error text-rose-400" aria-hidden="true" />
          Siniestralidad y Seguridad
          {totalAlertas > 0 && (
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-300">
              {totalAlertas} activo{totalAlertas !== 1 ? 's' : ''}
            </span>
          )}
        </h2>
        {isAdmin && (
          <WeldixButton
            variant="secondary"
            size="sm"
            onClick={() => setModal(tab === 'permisos' ? 'permisos' : 'accidentes')}
          >
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

      {error && (
        <p className="rounded-lg border border-rose-800/50 bg-rose-500/10 p-3 text-sm text-rose-400">
          {error}
        </p>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((n) => (
            <div key={n} className={cx(cardBase, 'h-16 animate-pulse')} />
          ))}
        </div>
      )}

      {/* Accidentes */}
      {!isLoading && tab === 'accidentes' && (
        <div className="space-y-2">
          {accidentes.length === 0 && (
            <div className={cx(cardBase, 'py-6 text-center text-sm text-slate-500')}>
              No hay accidentes / incidentes registrados.
            </div>
          )}
          {accidentes.map((acc) => {
            const tipoCfg = TIPO_ACCIDENTE[acc.tipo] ?? TIPO_ACCIDENTE.accidente
            return (
              <div key={acc.id} className={cx(cardBase, 'flex items-start justify-between gap-3')}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cx('text-xs font-bold', tipoCfg.color)}>{tipoCfg.label}</span>
                    <span className="text-xs text-slate-500">
                      {acc.fecha_hora?.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                  {acc.afectado_nombre && (
                    <p className="text-sm font-bold text-slate-100 mt-0.5">{acc.afectado_nombre}</p>
                  )}
                  {acc.lugar && <p className="text-xs text-slate-400">{acc.lugar}</p>}
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{acc.descripcion}</p>
                  {acc.dias_baja > 0 && (
                    <p className="mt-0.5 text-xs text-rose-400">
                      {acc.dias_baja} día{acc.dias_baja !== 1 ? 's' : ''} de baja
                    </p>
                  )}
                </div>
                <span
                  className={cx(
                    'shrink-0 rounded border px-2 py-0.5 text-xs font-bold uppercase',
                    ESTADO_ACCIDENTE[acc.estado] ?? ESTADO_ACCIDENTE.abierto
                  )}
                >
                  {acc.estado.replace('_', ' ')}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Permisos especiales */}
      {!isLoading && tab === 'permisos' && (
        <div className="space-y-2">
          {permisos.length === 0 && (
            <div className={cx(cardBase, 'py-6 text-center text-sm text-slate-500')}>
              No hay permisos especiales registrados.
            </div>
          )}
          {permisos.map((permiso) => (
            <div
              key={permiso.id}
              className={cx(cardBase, 'flex items-start justify-between gap-3')}
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-100">{permiso.tipo_label}</p>
                {permiso.operario_nombre && (
                  <p className="text-xs text-slate-500">{permiso.operario_nombre}</p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">Emisión: {permiso.fecha_emision}</p>
                {permiso.fecha_caducidad && (
                  <div className="mt-1">
                    <AlertaBadge dias={permiso.dias_para_caducar} />
                  </div>
                )}
                {permiso.descripcion_trabajo && (
                  <p className="mt-0.5 text-xs italic text-slate-500 line-clamp-1">
                    {permiso.descripcion_trabajo}
                  </p>
                )}
              </div>
              <span
                className={cx(
                  'shrink-0 rounded border px-2 py-0.5 text-xs font-bold uppercase',
                  ESTADO_PERMISO[permiso.estado] ?? ESTADO_PERMISO.activo
                )}
              >
                {permiso.estado}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Índices de siniestralidad */}
      {!isLoading && tab === 'indices' && indices && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Año
            </label>
            <select
              value={yearIndices}
              onChange={(e) => setYearIndices(Number(e.target.value))}
              className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            >
              {[0, 1, 2].map((offset) => {
                const y = new Date().getFullYear() - offset
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                )
              })}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <IndicesMetrica
              label="Accidentes"
              value={indices.total_accidentes}
              color="text-rose-400"
            />
            <IndicesMetrica
              label="Incidentes"
              value={indices.total_incidentes}
              color="text-amber-400"
            />
            <IndicesMetrica
              label="Near miss"
              value={indices.total_casi_accidentes}
              color="text-sky-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <IndicesMetrica
              label="Días de baja"
              value={indices.total_dias_baja}
              color="text-rose-300"
            />
            <IndicesMetrica label="Horas trabajadas" value={Math.round(indices.horas_trabajadas)} />
          </div>
          <div className={cx(cardBase, 'space-y-2')}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Índices legales
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Índice de frecuencia (IF)</span>
              <span className="font-bold text-slate-100">{indices.indice_frecuencia}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Índice de gravedad (IG)</span>
              <span className="font-bold text-slate-100">{indices.indice_gravedad}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Índice de incidencia (II)</span>
              <span className="font-bold text-slate-100">{indices.indice_incidencia}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modales */}
      {modal === 'accidentes' && (
        <NuevoAccidenteModal
          operarios={operarios}
          onClose={() => setModal(null)}
          onSubmit={handleReportarAccidente}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}
      {modal === 'permisos' && (
        <NuevoPermisoModal
          operarios={operarios}
          onClose={() => setModal(null)}
          onSubmit={handleRegistrarPermiso}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}
    </div>
  )
}

export default SiniestridadSection
