import { useEffect, useState } from 'react'
import { useJornada } from '../hooks/useJornada'

// ── Helpers de formato ────────────────────────────────────────────────────────
const fmtHora  = (iso) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
const fmtFecha = (iso) => new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
const fmtHoras = (h)   => {
  if (!h && h !== 0) return '—'
  const hrs  = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return hrs > 0 ? `${hrs}h ${mins}min` : `${mins}min`
}

// ── Modal de historial de jornadas ────────────────────────────────────────────
const HistorialModal = ({ historial, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
    <div
      className="relative z-10 w-full max-w-[480px] rounded-t-2xl border border-slate-700/80 bg-slate-900 shadow-2xl sm:rounded-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-200">Historial de jornadas</h2>
        <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 text-xs">✕</button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {historial.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Sin jornadas registradas aún.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-5 py-2.5 text-left text-[0.6rem] font-bold uppercase tracking-widest text-slate-500">Día</th>
                <th className="py-2.5 text-left text-[0.6rem] font-bold uppercase tracking-widest text-slate-500">Entrada</th>
                <th className="py-2.5 text-left text-[0.6rem] font-bold uppercase tracking-widest text-slate-500">Salida</th>
                <th className="py-2.5 pr-5 text-right text-[0.6rem] font-bold uppercase tracking-widest text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((f) => (
                <tr key={f.id} className="border-b border-slate-800/50 last:border-0">
                  <td className="px-5 py-3 text-xs text-slate-300">{fmtFecha(f.inicio)}</td>
                  <td className="py-3 text-xs font-mono text-emerald-300">{fmtHora(f.inicio)}</td>
                  <td className="py-3 text-xs font-mono text-slate-400">
                    {f.fin ? fmtHora(f.fin) : <span className="text-emerald-400 animate-pulse">En curso</span>}
                  </td>
                  <td className="py-3 pr-5 text-right text-xs font-semibold text-slate-200">
                    {f.horas != null ? fmtHoras(f.horas) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>
)

// ── Resumen de jornada recién cerrada ─────────────────────────────────────────
const ResumenCierre = ({ jornada }) =>
  jornada && (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2">
      <span className="text-[0.65rem] text-slate-500">Última jornada:</span>
      <span className="font-mono text-xs text-slate-300">
        {fmtHora(jornada.inicio)} → {fmtHora(jornada.fin)}
      </span>
      <span className="rounded-md bg-slate-700/60 px-1.5 py-0.5 font-mono text-[0.65rem] font-bold text-cyan-300">
        {fmtHoras(jornada.horas)}
      </span>
    </div>
  )

// ── Componente principal ───────────────────────────────────────────────────────
const JornadaButton = () => {
  const {
    jornadaActiva, jornadaCerrada, horaEntrada, elapsed,
    historial, isLoading, isSubmitting, error,
    iniciar, finalizar, cargarHistorial,
  } = useJornada()

  const [historialAbierto, setHistorialAbierto] = useState(false)

  // Cargar historial al abrir el modal
  const abrirHistorial = () => {
    cargarHistorial()
    setHistorialAbierto(true)
  }

  // ── Estado: cargando ──────────────────────────────────────────────────────
  if (isLoading) return <div className="mt-3 h-10 w-full animate-pulse rounded-xl bg-slate-800" />

  return (
    <div className="mt-3 space-y-2">

      {/* Jornada ACTIVA */}
      {jornadaActiva && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Hora de entrada real — el dato que importa para el ministerio */}
          <div className="flex items-center gap-2 rounded-lg border border-emerald-700/50 bg-emerald-500/10 px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[0.65rem] text-emerald-500 uppercase tracking-widest">Entrada</span>
            <span className="font-mono text-sm font-bold text-emerald-300">{horaEntrada}</span>
            {elapsed && (
              <span className="text-[0.62rem] text-emerald-600">· {elapsed}</span>
            )}
          </div>

          <button
            type="button"
            onClick={finalizar}
            disabled={isSubmitting}
            className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
          >
            {isSubmitting ? '...' : 'Finalizar jornada'}
          </button>
        </div>
      )}

      {/* Sin jornada activa */}
      {!jornadaActiva && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={iniciar}
            disabled={isSubmitting}
            className="rounded-xl border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
          >
            {isSubmitting ? '...' : 'Iniciar jornada'}
          </button>

          {/* Enlace al historial */}
          <button
            type="button"
            onClick={abrirHistorial}
            className="text-[0.62rem] uppercase tracking-widest text-slate-600 transition hover:text-slate-400"
          >
            Ver historial
          </button>
        </div>
      )}

      {/* También visible con jornada activa */}
      {jornadaActiva && (
        <button
          type="button"
          onClick={abrirHistorial}
          className="text-[0.6rem] uppercase tracking-widest text-slate-700 transition hover:text-slate-500"
        >
          Ver historial de jornadas
        </button>
      )}

      {/* Resumen de la jornada recién cerrada */}
      <ResumenCierre jornada={jornadaCerrada} />

      {error && <p className="text-[0.65rem] text-rose-400">{error}</p>}

      {historialAbierto && (
        <HistorialModal historial={historial} onClose={() => setHistorialAbierto(false)} />
      )}
    </div>
  )
}

export default JornadaButton
