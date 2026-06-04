import { toneFor } from '../../core/lib/tones'
import { cx } from '../../core/lib/cx'

const trendClasses = {
  up: 'bg-emerald-500/12 text-emerald-400',
  down: 'bg-rose-500/12 text-rose-400',
  neutral: 'bg-slate-700/60 text-slate-400',
}

const trendIcon = {
  up: '↑',
  down: '↓',
  neutral: '→',
}

const MetricCard = ({ item }) => {
  const tone = toneFor(item.tone)
  const trend = item.trend ?? 'neutral'

  return (
    <article
      className={cx('rounded-xl border bg-[var(--card-bg)] p-4', tone.metricTopBorder)}
      style={{ borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow-sm)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cx('text-3xl font-extrabold tabular-nums', tone.metricAccent)}>
          {item.value}
        </p>
        {item.delta && (
          <span
            className={cx(
              'mt-1 flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[0.65rem] font-bold',
              trendClasses[trend]
            )}
          >
            <span aria-hidden="true">{trendIcon[trend]}</span>
            {item.delta}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {item.label}
      </p>
      {item.description && <p className="mt-1 text-[0.65rem] text-slate-600">{item.description}</p>}
    </article>
  )
}

export default MetricCard
