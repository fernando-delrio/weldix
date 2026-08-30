import { useState } from 'react'
import WeldixButton from '../../core/components/WeldixButton'
import { cx } from '../../core/lib/cx'
import { useTheme } from '../../core/lib/ThemeContext'
import { useRrhhTurnos } from '../hooks/useRrhhTurnos'

const cardBase = 'rounded-xl border border-slate-700/60 bg-slate-900/65 p-4'
const inputBase =
  'w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 placeholder:text-slate-600'
const labelBase = 'block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-1'

const TURNO_CONFIG = {
  manana: { label: 'Mañana', color: 'bg-amber-500/20 text-amber-300 border-amber-700/50' },
  tarde: { label: 'Tarde', color: 'bg-orange-500/20 text-orange-300 border-orange-700/50' },
  noche: { label: 'Noche', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-700/50' },
  libre: { label: 'Libre', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-700/50' },
  festivo: { label: 'Festivo', color: 'bg-rose-500/20 text-rose-300 border-rose-700/50' },
}
const getTurnoConfig = (turno) => TURNO_CONFIG[turno] ?? TURNO_CONFIG.libre

const DIAS_SEMANA_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const formatSemana = (fecha_inicio, fecha_fin) => {
  const [y, m, d] = fecha_inicio.split('-').map(Number)
  const [, mf, df] = fecha_fin.split('-').map(Number)
  return `${d}/${m} — ${df}/${mf}/${y}`
}

// ── Badge de estado ───────────────────────────────────────────────────────────
const ESTADO_CAMBIO = {
  pendiente: 'border-amber-700/50 bg-amber-400/10 text-amber-300',
  aprobada: 'border-emerald-700/50 bg-emerald-500/10 text-emerald-300',
  rechazada: 'border-rose-700/50 bg-rose-500/10 text-rose-300',
}

// ── Modal: asignar turno ──────────────────────────────────────────────────────
const AsignarTurnoModal = ({
  operarios,
  fechaInicial,
  operarioInicial,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [form, setForm] = useState({
    operario_id: operarioInicial ?? operarios[0]?.id ?? '',
    fecha: fechaInicial ?? new Date().toISOString().slice(0, 10),
    turno: 'manana',
    nota: '',
  })
  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.operario_id || !form.fecha) return
    onSubmit([
      {
        operario_id: Number(form.operario_id),
        fecha: form.fecha,
        turno: form.turno,
        nota: form.nota || null,
      },
    ])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100">Asignar turno</h3>
          <WeldixButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 border border-slate-700"
          >
            ✕
          </WeldixButton>
        </div>
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
            <label className={labelBase}>Fecha *</label>
            <input
              type="date"
              value={form.fecha}
              onChange={set('fecha')}
              className={inputBase}
              required
            />
          </div>
          <div>
            <label className={labelBase}>Turno *</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TURNO_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, turno: key }))}
                  className={cx(
                    'rounded-lg border px-2 py-2 text-xs font-bold transition',
                    form.turno === key
                      ? cfg.color
                      : 'border-slate-700 bg-slate-800/40 text-slate-500 hover:border-slate-600'
                  )}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelBase}>Nota</label>
            <input
              value={form.nota}
              onChange={set('nota')}
              className={inputBase}
              placeholder="Cobertura, sustitución…"
            />
          </div>
          <WeldixButton
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="w-full"
          >
            Guardar turno
          </WeldixButton>
        </form>
      </div>
    </div>
  )
}

// ── Modal: revisar cambio de turno ────────────────────────────────────────────
const RevisarCambioModal = ({ cambio, onClose, onSubmit, isSubmitting }) => {
  const [form, setForm] = useState({ estado: 'aprobada', comentario_admin: '' })
  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100">Revisar cambio de turno</h3>
          <WeldixButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 border border-slate-700"
          >
            ✕
          </WeldixButton>
        </div>
        <div className={cx(cardBase, 'mb-4 text-sm')}>
          <p className="font-bold text-slate-100">{cambio.solicitante_nombre}</p>
          <p className="text-xs text-slate-400 mt-1">
            Cede turno del {cambio.fecha_cedida} ({cambio.turno_cedido}) a cambio del{' '}
            {cambio.fecha_recibida} ({cambio.turno_recibido}) de {cambio.receptor_nombre}
          </p>
          {cambio.motivo && <p className="mt-1 text-xs italic text-slate-500">"{cambio.motivo}"</p>}
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <WeldixButton
              variant={form.estado === 'aprobada' ? 'success' : 'secondary'}
              onClick={() => setForm((p) => ({ ...p, estado: 'aprobada' }))}
              className="w-full"
            >
              Aprobar
            </WeldixButton>
            <WeldixButton
              variant={form.estado === 'rechazada' ? 'danger' : 'secondary'}
              onClick={() => setForm((p) => ({ ...p, estado: 'rechazada' }))}
              className="w-full"
            >
              Rechazar
            </WeldixButton>
          </div>
          <div>
            <label className={labelBase}>Comentario</label>
            <textarea
              value={form.comentario_admin}
              onChange={set('comentario_admin')}
              rows={2}
              className={cx(inputBase, 'resize-none')}
              placeholder="Razón de la decisión…"
            />
          </div>
          <WeldixButton
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            onClick={() => onSubmit(cambio.id, form)}
            className="w-full"
          >
            Confirmar
          </WeldixButton>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
const TurnosSection = ({ isAdmin, operarios = [] }) => {
  const { isDark } = useTheme()
  const {
    turnos,
    cambios,
    cambiosPendientes,
    semana,
    isLoading,
    isSubmitting,
    error,
    irSemanaAnterior,
    irSemanaSiguiente,
    guardarTurnos,
    aprobarCambio,
  } = useRrhhTurnos()

  const [tab, setTab] = useState('cuadrante')
  const [revisandoCambioId, setRevisandoCambioId] = useState(null)
  // { fecha, operario_id } al hacer click en celda | null = modal cerrado
  const [asignandoTurno, setAsignandoTurno] = useState(null)

  const cambioRevisando = cambios.find((c) => c.id === revisandoCambioId) ?? null

  const handleCeldaClick = (fecha, opId) => {
    if (!isAdmin) return
    setAsignandoTurno({ fecha, operario_id: opId })
  }

  const handleGuardarTurno = async (turnos) => {
    await guardarTurnos(turnos)
    setAsignandoTurno(null)
  }

  // Agrupar turnos por operario_id → { [id]: turno[] }
  const turnosPorOperario = turnos.reduce((acc, t) => {
    if (!acc[t.operario_id]) acc[t.operario_id] = { nombre: t.operario_nombre, turnos: [] }
    acc[t.operario_id].turnos.push(t)
    return acc
  }, {})

  // Días de la semana actual como strings YYYY-MM-DD
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semana.fecha_inicio + 'T00:00:00')
    d.setDate(d.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-100">
          <i className="bx bx-calendar-week text-violet-400" aria-hidden="true" />
          Turnos
          {cambiosPendientes.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
              {cambiosPendientes.length} cambio{cambiosPendientes.length !== 1 ? 's' : ''} pendiente
              {cambiosPendientes.length !== 1 ? 's' : ''}
            </span>
          )}
        </h2>
        {isAdmin && (
          <WeldixButton variant="secondary" size="sm" onClick={() => setAsignandoTurno({})}>
            + Asignar turno
          </WeldixButton>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['cuadrante', 'cambios'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cx(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest transition',
              tab === t
                ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                : 'border-slate-700 bg-slate-800/40 text-slate-500 hover:border-slate-600 hover:text-slate-400'
            )}
          >
            {t === 'cuadrante'
              ? 'Cuadrante'
              : `Cambios${cambiosPendientes.length > 0 ? ` (${cambiosPendientes.length})` : ''}`}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-rose-800/50 bg-rose-500/10 p-3 text-sm text-rose-400">
          {error}
        </p>
      )}

      {/* Cuadrante semanal */}
      {tab === 'cuadrante' && (
        <div className="space-y-3">
          {/* Navegación de semana */}
          <div className="flex items-center justify-between">
            <WeldixButton
              variant="ghost"
              size="sm"
              onClick={irSemanaAnterior}
              className="border border-slate-700"
            >
              ‹ Anterior
            </WeldixButton>
            <span className="text-sm font-bold text-slate-300">
              {formatSemana(semana.fecha_inicio, semana.fecha_fin)}
            </span>
            <WeldixButton
              variant="ghost"
              size="sm"
              onClick={irSemanaSiguiente}
              className="border border-slate-700"
            >
              Siguiente ›
            </WeldixButton>
          </div>

          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className={cx(cardBase, 'h-16 animate-pulse')} />
              ))}
            </div>
          )}

          {/* Cabecera días — siempre se muestra si hay operarios */}
          {!isLoading && operarios.length === 0 && (
            <div className={cx(cardBase, 'py-6 text-center text-sm text-slate-500')}>
              No hay operarios creados todavía.
            </div>
          )}

          {!isLoading && operarios.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="pr-3 text-left text-xs font-semibold uppercase text-slate-500 w-28">
                      Operario
                    </th>
                    {diasSemana.map((dia, i) => (
                      <th key={dia} className="text-center px-1">
                        <span className={cx('block text-slate-500', i >= 5 && 'text-slate-700')}>
                          {DIAS_SEMANA_LABELS[i]}
                        </span>
                        <span
                          className={cx(
                            'block font-bold',
                            i >= 5 ? 'text-slate-700' : 'text-slate-300'
                          )}
                        >
                          {new Date(dia + 'T00:00:00').getDate()}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {operarios.map((op) => {
                    const opTurnos = turnosPorOperario[op.id]?.turnos ?? []
                    return (
                      <tr key={op.id} className="border-t border-slate-800">
                        <td className="py-2 pr-3 text-xs font-semibold text-slate-300 truncate max-w-[112px]">
                          {op.full_name}
                        </td>
                        {diasSemana.map((dia) => {
                          const t = opTurnos.find((turno) => turno.fecha === dia)
                          const cfg = t ? getTurnoConfig(t.turno) : null
                          const turnoBadge = (hoverClass) => (
                            <span
                              className={cx(
                                'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold transition',
                                cfg.color,
                                hoverClass
                              )}
                            >
                              {cfg.label.slice(0, 3)}
                            </span>
                          )

                          return (
                            <td key={dia} className="p-0.5 text-center">
                              {isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleCeldaClick(dia, op.id)}
                                  aria-label={
                                    t
                                      ? `${cfg.label} el ${dia} para ${op.full_name} — click para cambiar`
                                      : `Asignar turno el ${dia} para ${op.full_name}`
                                  }
                                  title={
                                    t
                                      ? `${cfg.label} — click para cambiar`
                                      : 'Click para asignar turno'
                                  }
                                  className="flex min-h-10 w-full items-center justify-center rounded transition hover:bg-slate-800/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-400"
                                >
                                  {t ? (
                                    turnoBadge('hover:opacity-70')
                                  ) : (
                                    <span
                                      className={cx(
                                        'text-[10px] hover:text-slate-300',
                                        isDark ? 'text-slate-400' : 'text-slate-500'
                                      )}
                                    >
                                      +
                                    </span>
                                  )}
                                </button>
                              ) : (
                                <span className="flex min-h-10 items-center justify-center">
                                  {t ? (
                                    turnoBadge()
                                  ) : (
                                    <span
                                      className={cx(
                                        'text-[10px]',
                                        isDark ? 'text-slate-400' : 'text-slate-500'
                                      )}
                                    >
                                      —
                                    </span>
                                  )}
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Cambios de turno */}
      {tab === 'cambios' && (
        <div className="space-y-2">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2].map((n) => (
                <div key={n} className={cx(cardBase, 'h-16 animate-pulse')} />
              ))}
            </div>
          )}
          {!isLoading && cambios.length === 0 && (
            <div className={cx(cardBase, 'py-6 text-center text-sm text-slate-500')}>
              No hay solicitudes de cambio de turno.
            </div>
          )}
          {!isLoading &&
            cambios.map((cambio) => (
              <div
                key={cambio.id}
                className={cx(cardBase, 'flex items-start justify-between gap-3')}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-100">{cambio.solicitante_nombre}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {cambio.fecha_cedida} ({cambio.turno_cedido}) ⇄ {cambio.fecha_recibida} (
                    {cambio.turno_recibido}) — {cambio.receptor_nombre}
                  </p>
                  {cambio.motivo && (
                    <p className="text-xs italic text-slate-500 mt-0.5">"{cambio.motivo}"</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={cx(
                      'rounded border px-2 py-0.5 text-xs font-bold uppercase',
                      ESTADO_CAMBIO[cambio.estado] ?? ESTADO_CAMBIO.pendiente
                    )}
                  >
                    {cambio.estado}
                  </span>
                  {isAdmin && cambio.estado === 'pendiente' && (
                    <WeldixButton
                      variant="primary"
                      size="sm"
                      onClick={() => setRevisandoCambioId(cambio.id)}
                    >
                      Revisar
                    </WeldixButton>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {cambioRevisando && (
        <RevisarCambioModal
          cambio={cambioRevisando}
          onClose={() => setRevisandoCambioId(null)}
          onSubmit={async (id, form) => {
            await aprobarCambio(id, form)
            setRevisandoCambioId(null)
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {asignandoTurno !== null && (
        <AsignarTurnoModal
          operarios={operarios}
          fechaInicial={asignandoTurno.fecha ?? null}
          operarioInicial={asignandoTurno.operario_id ?? null}
          onClose={() => setAsignandoTurno(null)}
          onSubmit={handleGuardarTurno}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}

export default TurnosSection
