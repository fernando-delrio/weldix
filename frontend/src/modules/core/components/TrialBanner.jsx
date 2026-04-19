import { useBilling } from '../../billing/hooks/useBilling'

const urgencyConfig = (daysLeft) =>
  daysLeft <= 1
    ? { bg: 'bg-rose-500/15 border-rose-500/40', text: 'text-rose-300', icon: 'bx bx-error-circle', dot: 'bg-rose-400' }
    : { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-300', icon: 'bx bx-time-five', dot: 'bg-amber-400' }

const dayLabel = (n) => (n === 1 ? '1 día' : `${n} días`)

const TrialBanner = ({ daysLeft, onDismiss }) => {
  const cfg = urgencyConfig(daysLeft)
  const { startCheckout, isRedirecting } = useBilling()

  return (
    <div className={`mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${cfg.bg}`}>
      <div className="flex items-center gap-2.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full animate-pulse ${cfg.dot}`} />
        <i className={`${cfg.icon} text-lg ${cfg.text}`} />
        <p className={`text-sm font-semibold ${cfg.text}`}>
          Tu periodo de prueba termina en <strong>{dayLabel(daysLeft)}</strong>.
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => startCheckout('starter')}
          disabled={isRedirecting}
          className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-amber-400 transition disabled:opacity-60"
        >
          {isRedirecting ? (
            <i className="bx bx-loader-alt animate-spin" />
          ) : (
            'Activar plan'
          )}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className="text-slate-500 hover:text-slate-300 transition"
        >
          <i className="bx bx-x text-lg" />
        </button>
      </div>
    </div>
  )
}

export default TrialBanner
