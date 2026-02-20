import { toneFor } from './tones'
import PanelCard from './PanelCard'
import StageProgress from './StageProgress'

function ActiveJobCard({ job, onComplete, onRegisterMaterial }) {
  const statusTone = toneFor(job.statusTone)
  const dueTone = toneFor(job.dueTone)

  return (
    <PanelCard className="border-sky-500/55">
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-md border px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${statusTone.badge}`}>
          {job.status}
        </span>
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">#{job.id}</p>
      </div>

      <h3 className="mt-3 text-2xl font-bold leading-tight text-slate-100">{job.title}</h3>
      <p className="mt-1 text-sm text-slate-400">Cliente: {job.client}</p>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Progreso estimado</p>
        <span className="text-sm font-bold text-sky-300">{job.progress}%</span>
      </div>

      <StageProgress stages={job.stages} currentStage={job.currentStage} />

      <div className="mt-4 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onComplete}
          className="h-11 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-sm font-bold tracking-[0.03em] text-white transition hover:from-sky-400 hover:to-blue-400"
        >
          Marcar como completado
        </button>
        <button
          type="button"
          onClick={onRegisterMaterial}
          className="h-11 rounded-xl border border-slate-700 bg-slate-900/80 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-200"
        >
          Registrar materiales usados
        </button>
      </div>

      <div className="mt-3 flex justify-end">
        <span className={`rounded-md border px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${dueTone.badge}`}>
          {job.dueLabel}
        </span>
      </div>
    </PanelCard>
  )
}

export default ActiveJobCard
