import AppShell from '../../core/components/AppShell'
import PanelCard from '../../dashboard/components/PanelCard'
import { useJobs } from '../hooks/useJobs'
import JobCard from './JobCard'
import JobStatusFilter from './JobStatusFilter'

const loadingState = ({ isLoading }) =>
  isLoading && (
    <PanelCard>
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Cargando trabajos...</p>
      <div className="mt-3 h-2 w-full animate-pulse rounded bg-slate-800" />
      <div className="mt-2 h-2 w-2/3 animate-pulse rounded bg-slate-800" />
    </PanelCard>
  )

const errorState = ({ isLoading, error, refresh }) =>
  !isLoading && error && (
    <PanelCard className="border-rose-700/40">
      <p className="text-sm font-semibold text-rose-300">{error}</p>
      <button
        type="button"
        onClick={refresh}
        className="mt-3 rounded-lg border border-rose-500/40 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10"
      >
        Reintentar
      </button>
    </PanelCard>
  )

const emptyState = ({ isLoading, error, filteredJobs, activeFilter }) =>
  !isLoading && !error && filteredJobs.length === 0 && (
    <PanelCard>
      <p className="text-sm text-slate-400">No hay trabajos con estado "{activeFilter}".</p>
    </PanelCard>
  )

const jobsList = ({ isLoading, error, filteredJobs }) =>
  !isLoading && !error && filteredJobs.length > 0 && (
    <div className="space-y-3">
      {filteredJobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  )

function JobsPage() {
  const state = useJobs()
  const { activeFilter, setActiveFilter } = state

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[680px] space-y-4 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">Modulo</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-slate-100">Trabajos</h1>
        </div>

        <JobStatusFilter activeFilter={activeFilter} onFilterChange={setActiveFilter} />

        {loadingState(state)}
        {errorState(state)}
        {emptyState(state)}
        {jobsList(state)}
      </div>
    </AppShell>
  )
}

export default JobsPage
