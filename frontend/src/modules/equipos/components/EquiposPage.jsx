import { useState } from 'react'
import AppShell from '../../core/components/AppShell'
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
    <span className="rounded-md border border-amber-700/60 bg-amber-400/10 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-amber-300">
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
          {equipo.tipo && <p className="mt-0.5 text-[0.68rem] text-slate-500">{equipo.tipo}</p>}
        </div>
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest ${cfg.badge}`}
        >
          {cfg.label}
        </span>
      </div>

      {equipo.descripcion && <p className="text-xs text-slate-400">{equipo.descripcion}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <AlertaBadge equipo={equipo} />
        {equipo.ultimo_mantenimiento && (
          <span className="text-[0.62rem] text-slate-600">
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
            className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[0.68rem] text-slate-300 outline-none focus:border-sky-500"
          >
            {ESTADOS_OPCIONES.map((e) => (
              <option key={e} value={e}>
                {getEstadoConfig(e).label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onRegistrarMantenimiento(equipo.id)}
            className="rounded-md border border-emerald-700/50 bg-emerald-500/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/20"
          >
            Registrar mantenimiento hoy
          </button>

          <button
            type="button"
            onClick={() => onEliminar(equipo.id)}
            className="ml-auto rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[0.62rem] text-slate-500 transition hover:border-rose-700/50 hover:text-rose-400"
          >
            Eliminar
          </button>
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
  const labelBase =
    'block text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[480px] rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Nuevo equipo</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-sm font-bold text-white transition hover:from-sky-400 hover:to-blue-500 disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando...' : 'Crear equipo'}
          </button>
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
        {equiposConAlerta.map((e) => (
          <li key={e.id} className="text-xs text-amber-200/70">
            {e.nombre} — {e.dias_desde_mantenimiento}d sin mantenimiento
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
        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Equipos del taller</h1>
            <p className="text-xs text-slate-500">{equipos.length} equipos registrados</p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="rounded-xl border border-sky-700/50 bg-sky-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-sky-300 transition hover:bg-sky-500/20"
            >
              + Nuevo equipo
            </button>
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
