import AppShell from '../../core/components/AppShell'
import PanelCard from '../../core/components/PanelCard'
import WeldixButton from '../../core/components/WeldixButton'
import PageHeader from '../../core/components/PageHeader'
import EmptyState from '../../core/components/EmptyState'
import { SkeletonList } from '../../core/components/Skeleton'
import { useJobs } from '../hooks/useJobs'
import JobCard from './JobCard'
import JobStatusFilter from './JobStatusFilter'

const loadingState = ({ isLoading }) => isLoading && <SkeletonList rows={5} />

const errorState = ({ isLoading, error, refresh }) =>
  !isLoading &&
  error && (
    <PanelCard className="border-rose-700/40">
      <p className="text-sm font-semibold text-rose-300">{error}</p>
      <WeldixButton variant="danger" size="sm" onClick={refresh} className="mt-3">
        Reintentar
      </WeldixButton>
    </PanelCard>
  )

const emptyState = ({ isLoading, error, filteredJobs, activeFilter }) =>
  !isLoading &&
  !error &&
  filteredJobs.length === 0 && (
    <EmptyState
      icon="bx-list-check"
      title={
        activeFilter === 'Todos' ? 'Sin órdenes de trabajo' : `Sin trabajos en "${activeFilter}"`
      }
      description={
        activeFilter === 'Todos'
          ? 'Crea la primera OT desde el panel de administración.'
          : 'Cambia el filtro para ver trabajos en otros estados.'
      }
    />
  )

const jobsList = ({ isLoading, error, filteredJobs }) =>
  !isLoading &&
  !error &&
  filteredJobs.length > 0 && (
    <div className="space-y-3">
      {filteredJobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  )

const JobsPage = () => {
  const state = useJobs()
  const { activeFilter, setActiveFilter } = state

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[680px] space-y-4 pb-5">
        <PageHeader label="Trabajos" title="Órdenes de trabajo" />

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
