import { cx } from '../lib/cx'

export const SkeletonLine = ({ width = 'w-full', height = 'h-4', className }) => (
  <div className={cx('animate-pulse rounded-md bg-slate-800', height, width, className)} />
)

export const SkeletonCard = ({ rows = 2, className }) => (
  <div
    className={cx('rounded-xl border bg-[var(--card-bg)] p-4', className)}
    style={{ borderColor: 'var(--card-border)' }}
  >
    <SkeletonLine width="w-20" height="h-3" />
    <SkeletonLine width="w-16" height="h-8" className="mt-2" />
    {rows >= 3 && <SkeletonLine width="w-full" height="h-3" className="mt-3" />}
    {rows >= 4 && <SkeletonLine width="w-2/3" height="h-3" className="mt-1.5" />}
  </div>
)

export const SkeletonMetricStrip = () => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {[1, 2, 3, 4].map((i) => (
      <SkeletonCard key={i} rows={2} />
    ))}
  </div>
)

export const SkeletonList = ({ rows = 4 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }, (_, i) => (
      <div
        key={i}
        className="rounded-lg border bg-[var(--card-bg)] px-4 py-3"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className="flex items-center gap-3">
          <SkeletonLine width="w-12" height="h-3" />
          <SkeletonLine width="flex-1" height="h-3" />
          <SkeletonLine width="w-16" height="h-5" />
        </div>
      </div>
    ))}
  </div>
)
