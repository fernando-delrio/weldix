// ── Helpers ─────────────────────────────────────────────────────────────────
const codeTag = ({ code }) =>
  code && (
    <span className="rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 font-mono text-xs font-bold text-slate-200 tracking-wide">
      {code}
    </span>
  )

const statusBadge = ({ estadoLabel, toneClasses }) => (
  <span className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] ${toneClasses.bg} ${toneClasses.text}`}>
    {estadoLabel}
  </span>
)

const progressBar = ({ progreso }) => (
  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
    <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progreso}%` }} />
  </div>
)

const operarioTag = ({ operario_name }) => (
  <div className="mt-3 flex items-center gap-2">
    <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">Operario</span>
    {operario_name
      ? <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-300">{operario_name}</span>
      : <span className="text-xs text-slate-600 italic">Sin asignar</span>
    }
  </div>
)

const deleteButton = ({ onDelete }) => (
  <button
    type="button"
    onClick={onDelete}
    className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-400 transition hover:border-rose-500/60 hover:bg-rose-500/10"
  >
    Eliminar
  </button>
)

// ── Componente ───────────────────────────────────────────────────────────────
const AdminJobCard = ({ job, onDelete }) => (
  <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
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

    {progressBar(job)}
    {operarioTag(job)}
  </div>
)

export default AdminJobCard
