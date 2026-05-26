import { useBilling } from '../../billing/hooks/useBilling'
import WeldixButton from './WeldixButton'

const urgencyConfig = (daysLeft) =>
  daysLeft <= 1
    ? {
        bg: 'bg-rose-500/15 border-rose-500/40',
        text: 'text-rose-300',
        icon: 'bx bx-error-circle',
        dot: 'bg-rose-400',
      }
    : {
        bg: 'bg-amber-500/10 border-amber-500/30',
        text: 'text-amber-300',
        icon: 'bx bx-time-five',
        dot: 'bg-amber-400',
      }

const dayLabel = (n) => (n === 1 ? '1 día' : `${n} días`)

const TrialBanner = ({ daysLeft, onDismiss }) => {
  const cfg = urgencyConfig(daysLeft)
  const { startCheckout, isRedirecting } = useBilling()

  return (
    <div
      className={`mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${cfg.bg}`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full animate-pulse ${cfg.dot}`} />
        <i className={`${cfg.icon} text-lg ${cfg.text}`} />
        <p className={`text-sm font-semibold ${cfg.text}`}>
          Tu periodo de prueba termina en <strong>{dayLabel(daysLeft)}</strong>.
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <WeldixButton
          variant="warning"
          size="sm"
          onClick={() => startCheckout('starter')}
          isLoading={isRedirecting}
          loadingLabel="Redirigiendo a pago…"
          className="bg-amber-500 text-slate-950 hover:bg-amber-400"
        >
          Activar plan
        </WeldixButton>
        <WeldixButton
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className="h-8 w-8 text-slate-500"
        >
          <i className="bx bx-x text-lg" />
        </WeldixButton>
      </div>
    </div>
  )
}

export default TrialBanner
