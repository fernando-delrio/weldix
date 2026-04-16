import { cx } from '../../core/lib/cx'
import { getStatusConfig } from '../../core/lib/statusConfig'
import { STATUS_FILTERS } from '../hooks/useJobs'

const filterLabel = (key) => key === 'todos' ? 'Todos' : getStatusConfig(key).label

const filterButtonClass = ({ activeFilter, filter }) =>
  cx(
    'shrink-0 rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] transition',
    activeFilter === filter
      ? 'bg-sky-500/20 text-sky-300 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.4)]'
      : 'text-slate-400 hover:text-slate-300',
  )

const JobStatusFilter = ({ activeFilter, onFilterChange }) => (
  <div className="flex overflow-x-auto pb-1">
    <div className="inline-flex gap-1 rounded-full border border-slate-700/60 bg-slate-900/80 p-1">
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
  </div>
)

export default JobStatusFilter
