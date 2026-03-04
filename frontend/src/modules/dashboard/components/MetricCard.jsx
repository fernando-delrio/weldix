import { toneFor } from '../lib/tones'

function MetricCard({ item }) {
  const tone = toneFor(item.tone)

  return (
    <article className={`rounded-xl border bg-slate-950/55 p-3 ${tone.metricBorder}`}>
      <p className={`text-center text-3xl font-extrabold ${tone.metricAccent}`}>{item.value}</p>
      <p className="mt-1 text-center text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {item.label}
      </p>
    </article>
  )
}

export default MetricCard
