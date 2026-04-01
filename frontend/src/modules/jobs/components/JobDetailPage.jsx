import { useNavigate } from 'react-router-dom'

import AppShell from '../../core/components/AppShell'
import { getStatusConfig } from '../../core/lib/statusConfig'
import { useJobDetail } from '../hooks/useJobDetail'
import FotosGallery from './FotosGallery'
import RegistroHorasOT from '../../registro_horas/components/RegistroHorasOT'

// ── Estilos base ──────────────────────────────────────────────────────────────
const cardBase  = 'rounded-xl border border-cyan-900/50 bg-slate-900/65 p-5'
const labelBase = 'text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500'

// ── Subcomponentes nombrados — Guard Clauses (CLAUDE.md §7) ───────────────────

const loadingSkeleton = ({ isLoading }) =>
  isLoading && (
    <div className={cardBase}>
      <div className="h-5 w-1/3 animate-pulse rounded bg-slate-800" />
      <div className="mt-3 h-7 w-2/3 animate-pulse rounded bg-slate-800" />
      <div className="mt-4 h-2 w-full animate-pulse rounded bg-slate-800" />
      <div className="mt-6 grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-10 animate-pulse rounded bg-slate-800" />
        ))}
      </div>
    </div>
  )

const errorBanner = ({ isLoading, error }) =>
  !isLoading && error && (
    <div className={`${cardBase} border-rose-700/40`}>
      <p className="text-sm text-rose-300">{error}</p>
    </div>
  )

const progressBar = ({ progress }) => (
  <div className="mt-4">
    <div className="h-2 w-full rounded-full bg-slate-800">
      <div
        className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
    <p className="mt-1 text-right text-[0.65rem] text-slate-500">{progress}%</p>
  </div>
)

const infoField = (label, value) => (
  <div>
    <p className={labelBase}>{label}</p>
    <p className="mt-0.5 text-sm text-slate-200">{value || '-'}</p>
  </div>
)

const descriptionSection = ({ description }) =>
  description && (
    <section className={cardBase}>
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Descripción / Tipo</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">{description}</p>
    </section>
  )

const advanceButton = ({ canAdvance, isAdvancing, advance, job }) => {
  const { nextLabel } = getStatusConfig(job.statusKey)
  return canAdvance && (
    <button
      type="button"
      onClick={advance}
      disabled={isAdvancing}
      className="h-14 w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-sm font-bold tracking-[0.1em] text-white transition hover:from-sky-400 hover:to-blue-500 disabled:opacity-60 sm:h-12"
    >
      {isAdvancing ? 'Guardando...' : nextLabel}
    </button>
  )
}

// Línea de tiempo del historial — un punto por evento
const historyTimeline = ({ history }) =>
  history.length > 0 && (
    <section className={cardBase}>
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Historial</h2>
      <ol className="mt-4 space-y-4">
        {history.map((event) => (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500 mt-0.5" />
              <div className="w-px flex-1 bg-slate-700" />
            </div>
            <div className="pb-2">
              <p className="text-sm text-slate-200">{event.descripcion}</p>
              <p className="mt-0.5 text-[0.68rem] text-slate-500">{event.date} · {event.time} · {event.usuario}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )

const jobContent = (state) => {
  const { isLoading, error, job, history, isAdvancing, advance, canAdvance } = state
  if (isLoading || error || !job) return null

  const statusCfg = getStatusConfig(job.statusKey)

  return (
    <div className="space-y-4">
      {/* Cabecera — código, título, estado */}
      <section className={cardBase}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.62rem] uppercase tracking-[0.14em] text-slate-500">
              {job.code ?? `#${job.id}`}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-100">{job.title}</h1>
            <p className="mt-0.5 text-sm text-slate-400">{job.client}</p>
          </div>
          <span
            className={`shrink-0 rounded-md border px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] ${statusCfg.bgClass}`}
          >
            {job.status}
          </span>
        </div>
        {progressBar(job)}
      </section>

      {/* Info — fechas y metadatos */}
      <section className={cardBase}>
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Información</h2>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
          {infoField('Cliente', job.client)}
          {infoField('Progreso', `${job.progress}%`)}
          {infoField('Fecha de entrega', job.dueDate)}
          {infoField('Creado el', job.createdAt)}
        </div>
      </section>

      {descriptionSection(job)}

      {/* Registro de horas en esta OT — múltiples operarios posibles */}
      <RegistroHorasOT jobId={job.id} />

      {/* Galería de fotos — antes/durante/después */}
      <FotosGallery jobId={job.id} />

      {historyTimeline({ history })}

      {advanceButton({ canAdvance, isAdvancing, advance, job })}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
const JobDetailPage = () => {
  const navigate = useNavigate()
  const state    = useJobDetail()

  return (
    <AppShell>
      {/* max-w-[720px] en lugar de 620 para que las fotos tengan más espacio en tablet */}
      <div className="mx-auto w-full max-w-[720px] space-y-4 pb-5">

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-300"
        >
          ← Volver
        </button>

        {loadingSkeleton(state)}
        {errorBanner(state)}
        {jobContent(state)}

      </div>
    </AppShell>
  )
}

export default JobDetailPage
