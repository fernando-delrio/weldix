import { cx } from '../../core/lib/cx'
import { STATUS_FILTERS } from '../hooks/useJobs'

const filterButtonClass = ({ activeFilter, filter }) =>
  cx(
    'shrink-0 rounded-lg border px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] transition',
    activeFilter === filter
      ? 'border-sky-500/70 bg-sky-500/20 text-sky-300'
      : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500 hover:text-slate-300',
  )

function JobStatusFilter({ activeFilter, onFilterChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {STATUS_FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onFilterChange(filter)}
          className={filterButtonClass({ activeFilter, filter })}
        >
          {filter}
        </button>
      ))}
    </div>
  )
}

export default JobStatusFilter
