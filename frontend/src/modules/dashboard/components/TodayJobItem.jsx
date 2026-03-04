import { toneFor } from '../lib/tones'

function TodayJobItem({ job }) {
  const tone = toneFor(job.tone)

  return (
    <article className="rounded-xl border border-cyan-900/50 bg-slate-900/65 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.62rem] uppercase tracking-[0.12em] text-slate-500">#{job.id}</p>
          <h4 className="mt-1 text-lg font-semibold text-slate-100">{job.title}</h4>
          <p className="text-sm text-slate-400">{job.area}</p>
        </div>
        <span className={`rounded-md border px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.12em] ${tone.badge}`}>
          {job.status}
        </span>
      </div>
      <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">{job.due}</p>
    </article>
  )
}

export default TodayJobItem
