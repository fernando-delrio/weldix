import { Link } from 'react-router-dom'
import { toneFor } from '../../dashboard/lib/tones'

// Acento lateral por estado — comunica el estado de un vistazo sin leer el badge
const STATUS_ACCENT = {
  pendiente:  'border-l-amber-500/70',
  en_proceso: 'border-l-sky-500/70',
  control:    'border-l-violet-500/70',
  listo:      'border-l-emerald-500/70',
  entregado:  'border-l-slate-600/50',
}

const progressBar = ({ progress }) =>
  progress > 0 && (
    <div className="mt-3">
      <div className="h-1.5 w-full rounded-full bg-slate-800">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-1 text-right text-[0.6rem] text-slate-500">{progress}%</p>
    </div>
  )

const JobCard = ({ job }) => {
  const tone       = toneFor(job.tone)
  const accentClass = STATUS_ACCENT[job.statusKey] ?? STATUS_ACCENT.pendiente

  return (
    <Link to={`/app/trabajos/${job.id}`} className="block">
      <article className={`rounded-xl border border-l-[3px] border-cyan-900/50 bg-slate-900/65 p-4 transition hover:border-cyan-700/60 hover:bg-slate-900/80 ${accentClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.62rem] uppercase tracking-[0.12em] text-slate-500">{job.code ?? `#${job.id}`}</p>
            <h4 className="mt-1 truncate text-lg font-semibold text-slate-100">{job.title}</h4>
            <p className="mt-0.5 text-sm text-slate-400">{job.client}</p>
          </div>
          <span
            className={`shrink-0 rounded-md border px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.12em] ${tone.badge}`}
          >
            {job.status}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <span>{job.type}</span>
          <span>{job.due}</span>
        </div>

        {progressBar(job)}
      </article>
    </Link>
  )
}

export default JobCard
