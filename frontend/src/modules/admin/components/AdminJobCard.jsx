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
    <span
      className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 font-mono text-xs font-bold text-slate-200 tracking-wide"
      style={{ borderColor: 'var(--card-border)' }}
    >
      {code}
    </span>
  )

const statusBadge = ({ estadoLabel, toneClasses }) => (
  <span
    className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.10em] ${toneClasses.bg} ${toneClasses.text}`}
  >
    {estadoLabel}
  </span>
)

const urgenteBadge = ({ urgente }) =>
  urgente && (
    <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-300">
      <i className="bx bx-error-circle" aria-hidden="true" /> Urgente
    </span>
  )

const operarioTag = ({ operario_name }) => (
  <div className="mt-3 flex items-center gap-2">
    <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Operario</span>
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
      className={`rounded-xl border-y border-r border-l-[3px] bg-[var(--card-bg)] p-4 ${accentClass}`}
      style={{
        borderTopColor: 'var(--card-border)',
        borderRightColor: 'var(--card-border)',
        borderBottomColor: 'var(--card-border)',
        boxShadow: 'var(--card-shadow-sm)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {codeTag(job)}
          {statusBadge(job)}
          {urgenteBadge(job)}
        </div>
        {deleteButton({ onDelete: () => onDelete(job.id) })}
      </div>

      <p className="mt-2 text-sm font-semibold text-slate-100">{job.titulo}</p>
      <p className="text-sm text-slate-400">{job.cliente}</p>

      {job.motivo_rechazo && (
        <p className="mt-1 text-xs text-rose-400">Motivo: {job.motivo_rechazo}</p>
      )}

      {job.fecha_inicio && (
        <p className="mt-1 text-xs text-slate-500">Entrega: {job.fecha_inicio}</p>
      )}

      <ProgressBar value={job.progreso} />
      {operarioTag(job)}
    </div>
  )
}

export default AdminJobCard
