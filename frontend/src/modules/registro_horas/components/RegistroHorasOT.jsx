import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { useRegistroHoras } from '../hooks/useRegistroHoras'

const cardBase = 'rounded-xl border border-cyan-900/50 bg-slate-900/65 p-5'

const fmtHoras = (h) => {
  if (!h && h !== 0) return '—'
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return hrs > 0 ? `${hrs}h ${mins}min` : `${mins}min`
}

const fmtFecha = (iso) =>
  new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) +
  ' · ' +
  new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

// ── Sección de control (botón iniciar / detener) ───────────────────────────────
const ControlHoras = ({ registroActivo, horaInicio, elapsed, isSubmitting, iniciar, detener }) => {
  const activo = Boolean(registroActivo)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activo ? (
        <>
          {/* Indicador de tiempo activo en esta OT */}
          <div className="flex items-center gap-2 rounded-lg border border-sky-700/50 bg-sky-500/10 px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
            <span className="text-[0.65rem] uppercase tracking-widest text-sky-500">
              Trabajando desde
            </span>
            <span className="font-mono text-sm font-bold text-sky-300">{horaInicio}</span>
            {elapsed && <span className="text-[0.62rem] text-sky-600">· {elapsed}</span>}
          </div>
          <button
            type="button"
            onClick={detener}
            disabled={isSubmitting}
            className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
          >
            {isSubmitting ? '...' : 'Detener tiempo'}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={iniciar}
          disabled={isSubmitting}
          className="rounded-xl border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
        >
          {isSubmitting ? '...' : 'Empezar a trabajar en esta OT'}
        </button>
      )}
    </div>
  )
}

// ── Resumen por operario ──────────────────────────────────────────────────────
const ResumenOperarios = ({ resumen }) => {
  if (!resumen || resumen.por_operario.length === 0) return null

  return (
    <div className="mt-4 space-y-2">
      <p className="text-[0.62rem] font-bold uppercase tracking-widest text-slate-500">
        Horas por operario · Total OT:{' '}
        <span className="text-cyan-300">{fmtHoras(resumen.total_horas)}</span>
      </p>
      <div className="space-y-1.5">
        {resumen.por_operario.map((op) => (
          <div
            key={op.operario_id}
            className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2"
          >
            <span className="text-sm text-slate-200">{op.operario_nombre}</span>
            <div className="flex items-center gap-3">
              <span className="text-[0.65rem] text-slate-500">
                {op.num_sesiones} sesión{op.num_sesiones !== 1 ? 'es' : ''}
              </span>
              <span className="font-mono text-sm font-bold text-cyan-300">
                {fmtHoras(op.total_horas)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Historial de sesiones (acordeón) ─────────────────────────────────────────
const HistorialSesiones = ({ registros }) => {
  if (!registros || registros.length === 0) return null

  // Solo mostramos sesiones cerradas en el historial
  const cerradas = registros.filter((r) => r.fin !== null)
  if (cerradas.length === 0) return null

  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-[0.62rem] font-bold uppercase tracking-widest text-slate-600 hover:text-slate-400">
        Ver sesiones ({cerradas.length})
      </summary>
      <div className="mt-2 space-y-1">
        {cerradas.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-lg border border-slate-800/60 px-3 py-1.5"
          >
            <div>
              <span className="text-xs text-slate-400">{r.operario_nombre}</span>
              <span className="ml-2 font-mono text-[0.65rem] text-slate-600">
                {fmtFecha(r.inicio)}
              </span>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-300">
              {fmtHoras(r.horas)}
            </span>
          </div>
        ))}
      </div>
    </details>
  )
}

// ── Vista solo lectura para admin — sin botones de control ──────────────────
const SinHorasAdmin = () => (
  <p className="text-xs text-slate-500">Sin horas registradas en esta OT todavía.</p>
)

// ── Componente principal ───────────────────────────────────────────────────────
const RegistroHorasOT = ({ jobId }) => {
  const { profile } = useAuthSession()
  const isAdmin = profile?.role === 'admin'

  const {
    registroActivo,
    resumen,
    elapsed,
    horaInicio,
    isLoading,
    isSubmitting,
    error,
    iniciar,
    detener,
  } = useRegistroHoras(jobId)

  const hayHoras = resumen && resumen.por_operario.length > 0

  return (
    <section className={cardBase}>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        Horas en esta OT
      </h2>

      {error && <p className="mb-2 text-xs text-rose-400">{error}</p>}

      {isLoading ? (
        <div className="h-8 animate-pulse rounded bg-slate-800" />
      ) : (
        <>
          {/* Operario: botones de control para iniciar/detener su tiempo */}
          {!isAdmin && (
            <ControlHoras
              registroActivo={registroActivo}
              horaInicio={horaInicio}
              elapsed={elapsed}
              isSubmitting={isSubmitting}
              iniciar={iniciar}
              detener={detener}
            />
          )}

          {/* Resumen por operario y total — visible para todos cuando hay datos */}
          {hayHoras ? (
            <>
              <ResumenOperarios resumen={resumen} />
              <HistorialSesiones registros={resumen?.registros} />
            </>
          ) : (
            // Admin sin horas: mensaje explícito. Operario sin horas: ya ve el botón de control.
            isAdmin && <SinHorasAdmin />
          )}
        </>
      )}
    </section>
  )
}

export default RegistroHorasOT
