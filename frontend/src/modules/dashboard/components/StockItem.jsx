import { toneFor } from '../lib/tones'

function StockItem({ item }) {
  const tone = toneFor(item.tone)

  return (
    <article className="rounded-xl border border-cyan-900/50 bg-slate-900/65 p-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-lg font-semibold text-slate-100">{item.name}</h4>
          <p className="mt-1 text-sm text-slate-400">
            {item.stockLabel} - {item.minimumLabel}
          </p>
        </div>
        <span className="pt-1 text-xs font-bold text-slate-400">{item.level}%</span>
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800">
        <div className={`h-1.5 rounded-full ${tone.stockBar}`} style={{ width: `${item.level}%` }} />
      </div>
    </article>
  )
}

export default StockItem
