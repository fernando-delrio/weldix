import { cx } from '../../core/lib/cx'

const StageProgress = ({ stages, currentStage }) => {
  const totalStages = stages.length || 1

  return (
    <div className="mt-3">
      <div
        role="progressbar"
        aria-valuenow={Math.round(((currentStage + 1) / totalStages) * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de etapas"
        className="mb-2 h-1.5 w-full rounded-full bg-slate-800"
      >
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-slate-300"
          style={{ width: `${((currentStage + 1) / totalStages) * 100}%` }}
        />
      </div>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${totalStages}, minmax(0, 1fr))` }}
      >
        {stages.map((stage, index) => {
          const isDone = index <= currentStage

          return (
            <div key={stage} className="flex flex-col items-center gap-1">
              <span
                className={cx(
                  'h-2 w-2 rounded-full border',
                  isDone
                    ? 'border-amber-300 bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.4)]'
                    : 'border-slate-700'
                )}
              />
              <span
                className={cx(
                  'text-[0.65rem] uppercase tracking-[0.10em]',
                  isDone ? 'text-amber-300' : 'text-slate-500'
                )}
              >
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
