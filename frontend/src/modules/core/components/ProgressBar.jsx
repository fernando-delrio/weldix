const ProgressBar = ({ value = 0, showLabel = false }) => {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="mt-2">
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso"
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && pct > 0 && <p className="mt-1 text-right text-xs text-slate-500">{pct}%</p>}
    </div>
  )
}

export default ProgressBar
