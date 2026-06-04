import { useState } from 'react'
import AppShell from '../../core/components/AppShell'
import WeldixButton from '../../core/components/WeldixButton'
import { useEquipos } from '../hooks/useEquipos'
import { useAuthSession } from '../../auth/hooks/useAuthSession'

// ── Config del semáforo de estado ──────────────────────────────────────────────
const ESTADO_CONFIG = {
  operativo: {
    label: 'Operativo',
    dot: 'bg-emerald-500',
    badge: 'border-emerald-700/50 bg-emerald-500/10 text-emerald-300',
  },
  en_revision: {
    label: 'En revisión',
    dot: 'bg-amber-400',
    badge: 'border-amber-700/50   bg-amber-400/10   text-amber-300',
  },
  averiado: {
    label: 'Averiado',
    dot: 'bg-rose-500',
    badge: 'border-rose-700/50    bg-rose-500/10    text-rose-300',
  },
  retirado: {
    label: 'Retirado',
    dot: 'bg-slate-600',
    badge: 'border-slate-700/50   bg-slate-700/20   text-slate-500',
  },
}
const getEstadoConfig = (estado) => ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.operativo

const ESTADOS_OPCIONES = Object.keys(ESTADO_CONFIG)

const cardBase = 'rounded-xl border border-cyan-900/50 bg-slate-900/65 p-5'

// ── Subcomponente: badge de alerta de mantenimiento ────────────────────────────
const AlertaBadge = ({ equipo }) =>
  equipo.alerta_mantenimiento && (
    <span className="rounded-md border border-amber-700/60 bg-amber-400/10 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-amber-300">
      Mantenimiento vencido · {equipo.dias_desde_mantenimiento}d
    </span>
  )

// ── Subcomponente: tarjeta de equipo ──────────────────────────────────────────
const EquipoCard = ({ equipo, onCambiarEstado, onRegistrarMantenimiento, onEliminar, isAdmin }) => {
  const cfg = getEstadoConfig(equipo.estado)

  return (
    <div className={`${cardBase} flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
            <h3 className="truncate text-sm font-bold text-slate-100">{equipo.nombre}</h3>
          </div>
          {equipo.tipo && <p className="mt-0.5 text-xs text-slate-500">{equipo.tipo}</p>}
        </div>
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-widest ${cfg.badge}`}
        >
          {cfg.label}
        </span>
      </div>

      {equipo.descripcion && <p className="text-xs text-slate-400">{equipo.descripcion}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <AlertaBadge equipo={equipo} />
        {equipo.ultimo_mantenimiento && (
          <span className="text-xs text-slate-600">
            Último mant.: {equipo.ultimo_mantenimiento} · cada {equipo.intervalo_dias}d
          </span>
        )}
      </div>

      {/* Acciones — solo para admin */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
          {/* Selector de estado rápido */}
          <select
            value={equipo.estado}
            onChange={(e) => onCambiarEstado(equipo.id, e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 outline-none focus:border-sky-500"
          >
            {ESTADOS_OPCIONES.map((estado) => (
              <option key={estado} value={estado}>
                {getEstadoConfig(estado).label}
              </option>
            ))}
          </select>

          <WeldixButton
            variant="success"
            size="sm"
            onClick={() => onRegistrarMantenimiento(equipo.id)}
          >
            Registrar mantenimiento hoy
          </WeldixButton>

          <WeldixButton
            variant="danger"
            size="sm"
            onClick={() => onEliminar(equipo.id)}
            className="ml-auto"
          >
            Eliminar
          </WeldixButton>
        </div>
      )}
    </div>
  )
}

// ── Modal de creación de equipo ───────────────────────────────────────────────
const NuevoEquipoModal = ({ onClose, onSubmit, isSubmitting }) => {
  const [form, setForm] = useState({
    nombre: '',
    tipo: '',
    descripcion: '',
    estado: 'operativo',
    ultimo_mantenimiento: '',
    intervalo_dias: 90,
  })

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...form,
      intervalo_dias: Number(form.intervalo_dias),
      ultimo_mantenimiento: form.ultimo_mantenimiento || null,
    })
  }

  const inputBase =
    'w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 placeholder:text-slate-600'
  const labelBase = 'block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[480px] rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Nuevo equipo</h2>
          <WeldixButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar modal de nuevo equipo"
            className="h-11 w-11 border border-slate-700"
          >
            ✕
          </WeldixButton>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelBase}>Nombre *</label>
            <input
              required
              value={form.nombre}
              onChange={setField('nombre')}
              placeholder="Ej: Soldadora MIG Lincoln 300A"
              className={inputBase}
            />
          </div>
          <div>
            <label className={labelBase}>Tipo</label>
            <input
              value={form.tipo}
              onChange={setField('tipo')}
              placeholder="Ej: Soldadora, Cortadora CNC, Grúa..."
              className={inputBase}
            />
          </div>
          <div>
            <label className={labelBase}>Descripción</label>
            <input
              value={form.descripcion}
              onChange={setField('descripcion')}
              placeholder="Notas adicionales"
              className={inputBase}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelBase}>Último mantenimiento</label>
              <input
                type="date"
                value={form.ultimo_mantenimiento}
                onChange={setField('ultimo_mantenimiento')}
                className={inputBase}
              />
            </div>
            <div>
              <label className={labelBase}>Intervalo (días)</label>
              <input
                type="number"
                min="1"
                value={form.intervalo_dias}
                onChange={setField('intervalo_dias')}
                className={inputBase}
              />
            </div>
          </div>

          <WeldixButton
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            loadingLabel="Guardando equipo…"
            className="mt-2 w-full"
          >
            Crear equipo
          </WeldixButton>
        </form>
      </div>
    </div>
  )
}

// ── Guard clauses ─────────────────────────────────────────────────────────────
const loadingState = ({ isLoading }) =>
  isLoading && (
    <div className="space-y-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className={`${cardBase} h-24 animate-pulse`} />
      ))}
    </div>
  )

const errorState = ({ error }) => error && <p className="text-sm text-rose-400">{error}</p>

const emptyState = ({ equipos, isLoading }) =>
  !isLoading &&
  equipos.length === 0 && (
    <div className={`${cardBase} text-center`}>
      <p className="text-sm text-slate-500">No hay equipos registrados.</p>
    </div>
  )

const alertaBanner = ({ equiposConAlerta }) =>
  equiposConAlerta.length > 0 && (
    <div className="rounded-xl border border-amber-700/50 bg-amber-400/5 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
        ⚠ {equiposConAlerta.length} equipo{equiposConAlerta.length > 1 ? 's' : ''} con mantenimiento
        vencido
      </p>
      <ul className="mt-2 space-y-1">
        {equiposConAlerta.map((equipo) => (
          <li key={equipo.id} className="text-xs text-amber-200/70">
            {equipo.nombre} — {equipo.dias_desde_mantenimiento}d sin mantenimiento
          </li>
        ))}
      </ul>
    </div>
  )

// ── Componente principal ───────────────────────────────────────────────────────
const EquiposPage = () => {
  const { profile } = useAuthSession()
  const isAdmin = profile?.role === 'admin'

  const {
    equipos,
    equiposConAlerta,
    isLoading,
    isSubmitting,
    error,
    modalAbierto,
    setModalAbierto,
    crearEquipo,
    cambiarEstado,
    registrarMantenimiento,
    eliminarEquipo,
  } = useEquipos()

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[720px] space-y-4 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-0.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-amber-400">
              GMAO
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight">Equipos del taller</h1>
            <p className="mt-1 text-sm text-slate-500">{equipos.length} equipos registrados</p>
          </div>
          {isAdmin && (
            <WeldixButton variant="primary" size="sm" onClick={() => setModalAbierto(true)}>
              + Nuevo equipo
            </WeldixButton>
          )}
        </div>

        {alertaBanner({ equiposConAlerta })}
        {errorState({ error })}
        {loadingState({ isLoading })}
        {emptyState({ equipos, isLoading })}

        {!isLoading &&
          equipos.map((equipo) => (
            <EquipoCard
              key={equipo.id}
              equipo={equipo}
              isAdmin={isAdmin}
              onCambiarEstado={cambiarEstado}
              onRegistrarMantenimiento={registrarMantenimiento}
              onEliminar={eliminarEquipo}
            />
          ))}
      </div>

      {modalAbierto && (
        <NuevoEquipoModal
          onClose={() => setModalAbierto(false)}
          onSubmit={crearEquipo}
          isSubmitting={isSubmitting}
        />
      )}
    </AppShell>
  )
}

export default EquiposPage
