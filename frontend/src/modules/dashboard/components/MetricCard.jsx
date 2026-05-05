import { toneFor } from '../lib/tones'

const MetricCard = ({ item }) => {
  const tone = toneFor(item.tone)

  return (
    <article
      className={`rounded-xl border border-white/[0.06] bg-slate-900 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${tone.metricTopBorder}`}
    >
      <p className={`text-3xl font-extrabold ${tone.metricAccent}`}>{item.value}</p>
      <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {item.label}
      </p>
    </article>
  )
}

export default MetricCard
