import { useState } from 'react'

import { useAdminDashboard } from '../hooks/useAdminDashboard'
import AdminJobCard from './AdminJobCard'
import KanbanView from './KanbanView'
import PanelCard from '../../core/components/PanelCard'

// ── Constantes ───────────────────────────────────────────────────────────────
const STATUS_FILTERS = ['Todos', 'pendiente', 'en_proceso', 'control', 'listo', 'entregado']
const FILTER_LABELS = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  control: 'Control',
  listo: 'Listo',
  entregado: 'Entregado',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const applyFilter = (jobs, filter) =>
  filter === 'Todos' ? jobs : jobs.filter((j) => j.estado === filter)

const filterTab = ({ key, label, isActive, onClick }) => (
  <button
    key={key}
    type="button"
    onClick={onClick}
    aria-pressed={isActive}
    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-[0.10em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
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
      <span className="text-lg font-extrabold leading-none text-yellow-300">
        {metrics.pendiente}
      </span>
      <span className="mt-0.5 text-xs font-bold uppercase tracking-[0.12em] text-yellow-300/80">
        Pendientes
      </span>
    </div>
    <div className="flex flex-col items-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
      <span className="text-lg font-extrabold leading-none text-amber-300">
        {metrics.en_proceso}
      </span>
      <span className="mt-0.5 text-xs font-bold uppercase tracking-[0.12em] text-amber-300/80">
        En proceso
      </span>
    </div>
  </div>
)

// ── Toggle de vista ───────────────────────────────────────────────────────────
const viewToggle = ({ view, onToggle }) => (
  <div className="flex rounded-lg border p-0.5" style={{ borderColor: 'var(--card-border)' }}>
    {[
      { id: 'list', icon: 'bx bx-list-ul', label: 'Lista' },
      { id: 'kanban', icon: 'bx bx-grid-alt', label: 'Kanban' },
    ].map((v) => (
      <button
        key={v.id}
        type="button"
        onClick={() => onToggle(v.id)}
        aria-pressed={view === v.id}
        aria-label={v.label}
        title={v.label}
        className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
          view === v.id ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <i className={`${v.icon} text-sm`} />
        <span className="hidden sm:inline">{v.label}</span>
      </button>
    ))}
  </div>
)

// ── Componente ───────────────────────────────────────────────────────────────
const AdminJobsSection = () => {
  const { dashboard, isLoading, removeJob, changeJobStatus, rejectJob } = useAdminDashboard()
  const [activeFilter, setActiveFilter] = useState('Todos')
  const [view, setView] = useState('list')
  const [moveError, setMoveError] = useState('')
  if (isLoading || !dashboard) return null

  const filteredJobs = applyFilter(dashboard.jobs, activeFilter)

  const handleMoveJob = async (jobId, toEstado) => {
    const result = await changeJobStatus(jobId, toEstado)
    setMoveError(result.ok ? '' : result.error)
  }
  const handleRejectJob = (jobId, motivo) => rejectJob(jobId, motivo)

  return (
    <section className="space-y-3">
      {moveError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-700/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          <span>{moveError}</span>
          <button
            type="button"
            onClick={() => setMoveError('')}
            aria-label="Cerrar aviso"
            className="shrink-0 text-rose-400 hover:text-rose-200"
          >
            <i className="bx bx-x text-lg" />
          </button>
        </div>
      )}

      {metricPills({ metrics: dashboard.metrics })}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
          Todos los trabajos
        </p>
        {viewToggle({ view, onToggle: setView })}
      </div>

      {view === 'list' && (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((f) =>
              filterTab({
                key: f,
                label: FILTER_LABELS[f] ?? f,
                isActive: activeFilter === f,
                onClick: () => setActiveFilter(f),
              })
            )}
          </div>

          {noJobsMessage({ filteredJobs, activeFilter })}

          {filteredJobs.map((job) => (
            <AdminJobCard key={job.id} job={job} onDelete={removeJob} />
          ))}
        </>
      )}

      {view === 'kanban' && (
        <KanbanView jobs={dashboard.jobs} onMoveJob={handleMoveJob} onRejectJob={handleRejectJob} />
      )}
    </section>
  )
}

export default AdminJobsSection
