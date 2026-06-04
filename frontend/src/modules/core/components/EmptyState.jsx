import { cx } from '../lib/cx'

const EmptyState = ({ icon = 'bx-inbox', title, description, action, className }) => (
  <div className={cx('flex flex-col items-center justify-center py-14 text-center', className)}>
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/40">
      <i className={cx('bx text-2xl text-slate-500', icon)} aria-hidden="true" />
    </div>
    <p className="text-sm font-semibold text-slate-300">{title}</p>
    {description && (
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-500">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
)

export default EmptyState
