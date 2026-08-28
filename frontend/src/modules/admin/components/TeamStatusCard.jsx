import { useAdminDashboard } from '../hooks/useAdminDashboard'
import PanelCard from '../../core/components/PanelCard'

// ── Strategy: cómo se ve cada estado ─────────────────────────────────────────
// "sin_fichar" va primero en la prioridad de orden — es la única señal que el
// admin necesita ver de un vistazo: alguien que debería estar y no está.
const STATUS_CONFIG = {
  en_taller: {
    label: 'En el taller',
    order: 1,
    cls: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  ausente: {
    label: null,
    order: 2,
    cls: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
    dot: 'bg-amber-400',
  },
  sin_fichar: {
    label: 'Sin fichar',
    order: 0,
    cls: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20',
    dot: 'bg-rose-400',
  },
}

const operarioStatus = (operario) => {
  if (operario.en_taller) return { key: 'en_taller', label: STATUS_CONFIG.en_taller.label }
  if (operario.ausente_hoy) return { key: 'ausente', label: operario.ausente_hoy }
  return { key: 'sin_fichar', label: STATUS_CONFIG.sin_fichar.label }
}

const initials = (name) =>
  (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((palabra) => palabra[0])
    .join('')
    .toUpperCase()

const StatusBadge = ({ statusKey, label }) => {
  const cfg = STATUS_CONFIG[statusKey]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {label}
    </span>
  )
}

const OperarioRow = ({ operario }) => {
  const status = operarioStatus(operario)
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-300">
        {initials(operario.full_name)}
      </div>
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--app-text)]">
        {operario.full_name || operario.email}
      </p>
      <StatusBadge statusKey={status.key} label={status.label} />
    </div>
  )
}

const summaryLine = (operarios) => {
  const enTaller = operarios.filter((o) => o.en_taller).length
  const ausentes = operarios.filter((o) => !o.en_taller && o.ausente_hoy).length
  const sinFichar = operarios.length - enTaller - ausentes
  return `${enTaller} en el taller · ${ausentes} ausentes · ${sinFichar} sin fichar`
}

const emptyState = (operarios) =>
  operarios.length === 0 && (
    <p className="text-sm text-slate-500">Todavía no hay operarios en plantilla.</p>
  )

const TeamStatusCard = () => {
  const { dashboard, isLoading } = useAdminDashboard()

  if (isLoading || !dashboard) return null

  const operarios = dashboard.operarios
    .slice()
    .sort(
      (a, b) =>
        STATUS_CONFIG[operarioStatus(a).key].order - STATUS_CONFIG[operarioStatus(b).key].order
    )

  return (
    <PanelCard>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          Quién está en el taller
        </h2>
        <span className="text-xs text-slate-500">{summaryLine(operarios)}</span>
      </div>
      <div className="mt-1 divide-y divide-[color:var(--card-border)]">
        {operarios.map((operario) => (
          <OperarioRow key={operario.id} operario={operario} />
        ))}
      </div>
      {emptyState(operarios)}
    </PanelCard>
  )
}

export default TeamStatusCard
