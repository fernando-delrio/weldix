import { getStatusConfig } from '../../core/lib/statusConfig'
import { useIaContext } from '../../ia/lib/IaContext'
import PanelCard from '../../core/components/PanelCard'
import { toneFor } from '../../core/lib/tones'
import StageProgress from './StageProgress'

const advanceButton = ({ nextLabel, onComplete }) =>
  nextLabel && (
    <button
      type="button"
      onClick={onComplete}
      className="h-11 rounded-xl bg-gradient-to-r from-amber-500 to-blue-500 text-sm font-bold tracking-[0.03em] text-white transition hover:from-amber-400 hover:to-blue-400"
    >
      {nextLabel}
    </button>
  )

const ActiveJobCard = ({ job, onComplete, onRegisterMaterial }) => {
  const statusTone = toneFor(job.statusTone)
  const dueTone = toneFor(job.dueTone)
  const { nextLabel } = getStatusConfig(job.statusKey)
  const { openChat } = useIaContext()

  const handleAskIA = () => {
    const contexto = `${job.code ?? `OT #${job.id}`} — ${job.title}\nCliente: ${job.client}\nEstado: ${job.status}\nProgreso: ${job.progress}%\nFecha entrega: ${job.dueLabel}`
    openChat(contexto)
  }

  return (
    <PanelCard className="border-amber-500/55">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-md border px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${statusTone.badge}`}
        >
          {job.status}
        </span>
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {job.code ?? `#${job.id}`}
        </p>
      </div>

      <h3 className="mt-3 text-2xl font-bold leading-tight text-slate-100">{job.title}</h3>
      <p className="mt-1 text-sm text-slate-400">Cliente: {job.client}</p>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Progreso estimado
        </p>
        <span className="text-sm font-bold text-amber-300">{job.progress}%</span>
      </div>

      <StageProgress stages={job.stages} currentStage={job.currentStage} />

      <div className="mt-4 flex flex-col gap-2.5">
        {advanceButton({ nextLabel, onComplete })}
        <button
          type="button"
          onClick={onRegisterMaterial}
          className="h-11 rounded-xl border border-slate-700 bg-slate-900/80 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-200"
        >
          Registrar materiales usados
        </button>
        <button
          type="button"
          onClick={handleAskIA}
          className="h-11 rounded-xl border border-amber-700/40 bg-amber-500/5 text-sm font-semibold text-amber-400 transition hover:border-amber-500/60 hover:bg-amber-500/10"
        >
          🔧 Consultar IA sobre este trabajo
        </button>
      </div>

      <div className="mt-3 flex justify-end">
        <span
          className={`rounded-md border px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${dueTone.badge}`}
        >
          {job.dueLabel}
        </span>
      </div>
    </PanelCard>
  )
}

export default ActiveJobCard
