import { Link } from 'react-router-dom'

const SectionHeader = ({ title, action, actionLabel, actionTo }) => (
  <div className="mb-2.5 flex items-center justify-between">
    <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{title}</h2>
    {action ??
      (actionLabel && actionTo && (
        <Link to={actionTo} className="text-xs font-semibold tracking-[0.12em] text-amber-400">
          {actionLabel}
        </Link>
      ))}
  </div>
)

export default SectionHeader
