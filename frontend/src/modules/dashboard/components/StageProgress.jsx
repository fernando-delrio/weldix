import { cx } from '../../core/lib/cx'

function StageProgress({ stages, currentStage }) {
  const totalStages = stages.length || 1

  return (
    <div className="mt-3">
      <div className="mb-2 h-1.5 w-full rounded-full bg-slate-800">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300"
          style={{ width: `${((currentStage + 1) / totalStages) * 100}%` }}
        />
      </div>

      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${totalStages}, minmax(0, 1fr))` }}>
        {stages.map((stage, index) => {
          const isDone = index <= currentStage

          return (
            <div key={stage} className="flex flex-col items-center gap-1">
              <span
                className={cx(
                  'h-2 w-2 rounded-full border',
                  isDone ? 'border-sky-300 bg-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.45)]' : 'border-slate-700',
                )}
              />
              <span className={cx('text-[0.5rem] uppercase tracking-[0.12em]', isDone ? 'text-sky-300' : 'text-slate-500')}>
                {stage}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StageProgress
