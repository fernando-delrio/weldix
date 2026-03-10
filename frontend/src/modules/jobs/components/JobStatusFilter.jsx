import { cx } from '../../core/lib/cx'
import { getStatusConfig } from '../../core/lib/statusConfig'
import { STATUS_FILTERS } from '../hooks/useJobs'

const filterLabel = (key) => key === 'todos' ? 'Todos' : getStatusConfig(key).label

const filterButtonClass = ({ activeFilter, filter }) =>
  cx(
    'shrink-0 rounded-lg border px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] transition',
    activeFilter === filter
      ? 'border-sky-500/70 bg-sky-500/20 text-sky-300'
      : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500 hover:text-slate-300',
  )

const JobStatusFilter = ({ activeFilter, onFilterChange }) => (
  <div className="flex gap-2 overflow-x-auto pb-1">
    {STATUS_FILTERS.map((filter) => (
      <button
        key={filter}
        type="button"
        onClick={() => onFilterChange(filter)}
        className={filterButtonClass({ activeFilter, filter })}
      >
        {filterLabel(filter)}
      </button>
    ))}
  </div>
)

export default JobStatusFilter
