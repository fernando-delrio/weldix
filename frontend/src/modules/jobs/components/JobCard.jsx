import { Link } from 'react-router-dom'
import { toneFor } from '../../core/lib/tones'
import ProgressBar from '../../core/components/ProgressBar'

// Acento lateral por estado — comunica el estado de un vistazo sin leer el badge
const STATUS_ACCENT = {
  pendiente: 'border-l-amber-500/70',
  en_proceso: 'border-l-sky-500/70',
  control: 'border-l-violet-500/70',
  listo: 'border-l-emerald-500/70',
  entregado: 'border-l-slate-600/50',
}

const JobCard = ({ job }) => {
  const tone = toneFor(job.tone)
  const accentClass = STATUS_ACCENT[job.statusKey] ?? STATUS_ACCENT.pendiente

  return (
    <Link to={`/app/trabajos/${job.id}`} className="block">
      <article
        className={`rounded-xl border border-l-[3px] border-slate-700/60 bg-slate-900/65 p-4 transition hover:border-slate-600/60 hover:bg-slate-900/80 ${accentClass}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
              {job.code ?? `#${job.id}`}
            </p>
            <h4 className="mt-1 truncate text-lg font-semibold text-slate-100">{job.title}</h4>
            <p className="mt-0.5 text-sm text-slate-400">{job.client}</p>
          </div>
          <span
            className={`shrink-0 rounded-md border px-2 py-1 text-xs font-bold uppercase tracking-[0.10em] ${tone.badge}`}
          >
            {job.status}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.10em] text-slate-500">
          <span>{job.type}</span>
          <span>{job.due}</span>
        </div>

        {job.progress > 0 && <ProgressBar value={job.progress} showLabel />}
      </article>
    </Link>
  )
}

export default JobCard
