import { Link } from 'react-router-dom'

const actionLink = ({ actionLabel, actionTo }) =>
  actionLabel && actionTo && (
    <Link to={actionTo} className="text-[0.68rem] font-semibold tracking-[0.14em] text-sky-400">
      {actionLabel}
    </Link>
  )

function SectionHeader({ title, actionLabel, actionTo }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-sky-300">{title}</h2>
      {actionLink({ actionLabel, actionTo })}
    </div>
  )
}

export default SectionHeader
