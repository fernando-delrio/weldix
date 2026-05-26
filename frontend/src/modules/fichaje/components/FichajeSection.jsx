import { useFichaje } from '../hooks/useFichaje'

// Semáforo de tiempo — verde si lleva menos de 4h, amarillo hasta 8h, rojo más
const colorTiempo = (inicio) => {
  const horas = (Date.now() - new Date(inicio).getTime()) / 3_600_000
  return horas < 4 ? 'bg-emerald-500' : horas < 8 ? 'bg-amber-400' : 'bg-rose-500'
}

const horasFormateadas = (inicio) => {
  const mins = Math.floor((Date.now() - new Date(inicio).getTime()) / 60_000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}min` : `${m} min`
}

const cardBase = 'rounded-xl border border-cyan-900/50 bg-slate-900/65 p-5'

// ── Subcomponente: header con horas acumuladas ─────────────────────────────────
const ResumenHoras = ({ horasTotales }) =>
  horasTotales && (
    <div className="flex items-center gap-2">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Total acumulado
      </span>
      <span className="text-sm font-bold text-cyan-300">{horasTotales.total_horas}h</span>
      <span className="text-[0.65rem] text-slate-600">({horasTotales.num_fichajes} sesiones)</span>
    </div>
  )

// ── Subcomponente: fichaje en curso ────────────────────────────────────────────
const FichajeEnCurso = ({ fichaje, isSubmitting, onFicharSalida }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-2.5">
      <span className={`h-2 w-2 rounded-full ${colorTiempo(fichaje.inicio)} animate-pulse`} />
      <div>
        <p className="text-sm font-semibold text-slate-100">Fichaje activo</p>
        <p className="text-[0.68rem] text-slate-400">
          Inicio:{' '}
          {new Date(fichaje.inicio).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {' · '}
          {horasFormateadas(fichaje.inicio)}
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onFicharSalida}
      disabled={isSubmitting}
      className="shrink-0 rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
    >
      {isSubmitting ? '...' : 'Fichar salida'}
    </button>
  </div>
)

// ── Subcomponente: sin fichaje abierto ─────────────────────────────────────────
const SinFichaje = ({ isSubmitting, onFicharEntrada }) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm text-slate-400">Sin fichaje activo en este trabajo</p>
    </div>
    <button
      type="button"
      onClick={onFicharEntrada}
      disabled={isSubmitting}
      className="shrink-0 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
    >
      {isSubmitting ? '...' : 'Fichar entrada'}
    </button>
  </div>
)

const errorMsg = ({ error }) => error && <p className="mt-2 text-xs text-rose-400">{error}</p>

// ── Componente principal ───────────────────────────────────────────────────────
const FichajeSection = ({ jobId }) => {
  const {
    fichajeActivo,
    horasTotales,
    isLoading,
    isSubmitting,
    error,
    ficharEntrada,
    ficharSalida,
  } = useFichaje(jobId)

  return (
    <section className={cardBase}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          Control de tiempo
        </h2>
        <ResumenHoras horasTotales={horasTotales} />
      </div>

      {isLoading ? (
        <div className="h-8 animate-pulse rounded bg-slate-800" />
      ) : fichajeActivo ? (
        <FichajeEnCurso
          fichaje={fichajeActivo}
          isSubmitting={isSubmitting}
          onFicharSalida={ficharSalida}
        />
      ) : (
        <SinFichaje isSubmitting={isSubmitting} onFicharEntrada={ficharEntrada} />
      )}

      {errorMsg({ error })}
    </section>
  )
}

export default FichajeSection
