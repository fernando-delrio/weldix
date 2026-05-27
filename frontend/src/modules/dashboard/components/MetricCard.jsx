import { toneFor } from '../../core/lib/tones'

const MetricCard = ({ item }) => {
  const tone = toneFor(item.tone)

  return (
    <article
      className={`rounded-xl border bg-slate-900 p-3 ${tone.metricTopBorder}`}
      style={{ borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow-sm)' }}
    >
      <p className={`text-3xl font-extrabold ${tone.metricAccent}`}>{item.value}</p>
      <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {item.label}
      </p>
    </article>
  )
}

export default MetricCard
