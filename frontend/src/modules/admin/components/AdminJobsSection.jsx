import { useState } from 'react'

import { useAdminDashboard } from '../hooks/useAdminDashboard'
import AdminJobCard from './AdminJobCard'
import PanelCard from '../../dashboard/components/PanelCard'

// ── Constantes ───────────────────────────────────────────────────────────────
const STATUS_FILTERS = ['Todos', 'pendiente', 'en_proceso', 'control', 'listo', 'entregado']
const FILTER_LABELS  = { pendiente: 'Pendiente', en_proceso: 'En proceso', control: 'Control', listo: 'Listo', entregado: 'Entregado' }

// ── Helpers ──────────────────────────────────────────────────────────────────
const applyFilter = (jobs, filter) => filter === 'Todos' ? jobs : jobs.filter((j) => j.estado === filter)

const filterTab = ({ key, label, isActive, onClick }) => (
  <button
    key={key}
    type="button"
    onClick={onClick}
    className={`shrink-0 rounded-lg px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.12em] transition ${
      isActive
        ? 'bg-amber-500/20 text-amber-300 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.4)]'
        : 'text-slate-500 hover:text-slate-300'
    }`}
  >
    {label}
  </button>
)

const noJobsMessage = ({ filteredJobs, activeFilter }) =>
  filteredJobs.length === 0 && (
    <PanelCard>
      <p className="text-sm text-slate-400">
        {activeFilter === 'Todos'
          ? 'No hay trabajos registrados.'
          : `No hay trabajos con estado "${FILTER_LABELS[activeFilter] ?? activeFilter}".`}
      </p>
    </PanelCard>
  )

const metricPills = ({ metrics }) => (
  <div className="grid grid-cols-2 gap-2">
    <div className="flex flex-col items-center rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5">
      <span className="text-lg font-extrabold leading-none text-yellow-300">{metrics.pendiente}</span>
      <span className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-yellow-300/80">Pendientes</span>
    </div>
    <div className="flex flex-col items-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
      <span className="text-lg font-extrabold leading-none text-amber-300">{metrics.en_proceso}</span>
      <span className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-amber-300/80">En proceso</span>
    </div>
  </div>
)

// ── Componente ───────────────────────────────────────────────────────────────
const AdminJobsSection = () => {
  const { dashboard, isLoading, removeJob } = useAdminDashboard()
  const [activeFilter, setActiveFilter] = useState('Todos')

  if (isLoading || !dashboard) return null

  const filteredJobs = applyFilter(dashboard.jobs, activeFilter)

  return (
    <section className="space-y-3">
      {metricPills({ metrics: dashboard.metrics })}

      <p className="text-[0.64rem] font-bold uppercase tracking-[0.2em] text-amber-300">Todos los trabajos</p>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) =>
          filterTab({ key: f, label: FILTER_LABELS[f] ?? f, isActive: activeFilter === f, onClick: () => setActiveFilter(f) })
        )}
      </div>

      {noJobsMessage({ filteredJobs, activeFilter })}

      {filteredJobs.map((job) => (
        <AdminJobCard key={job.id} job={job} onDelete={removeJob} />
      ))}
    </section>
  )
}

export default AdminJobsSection
