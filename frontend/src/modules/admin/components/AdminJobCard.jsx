import WeldixButton from '../../core/components/WeldixButton'
import ProgressBar from '../../core/components/ProgressBar'

// Acento lateral por estado — mismo sistema que JobCard
const STATUS_ACCENT = {
  pendiente: 'border-l-amber-500/70',
  en_proceso: 'border-l-sky-500/70',
  control: 'border-l-violet-500/70',
  listo: 'border-l-emerald-500/70',
  entregado: 'border-l-slate-600/50',
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const codeTag = ({ code }) =>
  code && (
    <span className="rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 font-mono text-xs font-bold text-slate-200 tracking-wide">
      {code}
    </span>
  )

const statusBadge = ({ estadoLabel, toneClasses }) => (
  <span
    className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] ${toneClasses.bg} ${toneClasses.text}`}
  >
    {estadoLabel}
  </span>
)

const operarioTag = ({ operario_name }) => (
  <div className="mt-3 flex items-center gap-2">
    <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">
      Operario
    </span>
    {operario_name ? (
      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
        {operario_name}
      </span>
    ) : (
      <span className="text-xs text-slate-600 italic">Sin asignar</span>
    )}
  </div>
)

const deleteButton = ({ onDelete }) => (
  <WeldixButton variant="danger" size="sm" onClick={onDelete}>
    Eliminar
  </WeldixButton>
)

// ── Componente ───────────────────────────────────────────────────────────────
const AdminJobCard = ({ job, onDelete }) => {
  const accentClass = STATUS_ACCENT[job.estado] ?? 'border-l-slate-600/50'

  return (
    <div
      className={`rounded-xl border border-l-[3px] border-slate-700/60 bg-slate-900/60 p-4 ${accentClass}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {codeTag(job)}
          {statusBadge(job)}
        </div>
        {deleteButton({ onDelete: () => onDelete(job.id) })}
      </div>

      <p className="mt-2 text-sm font-semibold text-slate-100">{job.titulo}</p>
      <p className="text-xs text-slate-400">{job.cliente}</p>

      {job.fecha_inicio && (
        <p className="mt-1 text-xs text-slate-500">Entrega: {job.fecha_inicio}</p>
      )}

      <ProgressBar value={job.progreso} />
      {operarioTag(job)}
    </div>
  )
}

export default AdminJobCard
