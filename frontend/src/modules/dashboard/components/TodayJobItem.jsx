import { toneFor } from '../../core/lib/tones'

const startButton = ({ onStart, canStart }) =>
  onStart && (
    <button
      type="button"
      onClick={onStart}
      disabled={!canStart}
      className="mt-3 w-full rounded-lg border border-amber-500/50 bg-amber-500/10 py-2 text-xs font-bold uppercase tracking-[0.12em] text-amber-300 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {canStart ? 'Iniciar trabajo' : 'Termina el trabajo activo primero'}
    </button>
  )

const TodayJobItem = ({ job, onStart, canStart }) => {
  const tone = toneFor(job.tone)

  return (
    <article
      className="rounded-xl border bg-[var(--card-bg)] p-3"
      style={{ borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow-sm)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.10em] text-slate-500">
            {job.code ?? `#${job.id}`}
          </p>
          <h4 className="mt-1 text-lg font-semibold text-slate-100">{job.title}</h4>
          <p className="text-sm text-slate-400">{job.area}</p>
        </div>
        <span
          className={`rounded-md border px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] ${tone.badge}`}
        >
          {job.status}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.10em] text-slate-500">
        {job.due}
      </p>
      {startButton({ onStart, canStart })}
    </article>
  )
}

export default TodayJobItem
