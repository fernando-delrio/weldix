import { useEffect } from 'react'
import { useBilling } from '../../billing/hooks/useBilling'
import PanelCard from './PanelCard'
import WeldixButton from './WeldixButton'

const daysUntil = (isoDate) => {
  const diffMs = new Date(isoDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

const dayLabel = (n) => (n === 1 ? '1 día' : `${n} días`)

const planBadge = (status) => {
  if (status.subscription_status === 'past_due') {
    return { label: 'Pago fallido', className: 'bg-rose-500/15 text-rose-300 border-rose-500/40' }
  }
  if (status.plan === 'active') {
    return {
      label: 'Plan activo',
      className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    }
  }
  return {
    label: 'Periodo de prueba',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  }
}

const trialSummary = ({ status }) =>
  status.plan !== 'active' &&
  status.trial_expires_at && (
    <p className="mt-1 text-sm text-slate-400">
      Te quedan{' '}
      <strong className="text-slate-200">{dayLabel(daysUntil(status.trial_expires_at))}</strong> de
      prueba.
    </p>
  )

const activeSummary = ({ status }) =>
  status.plan === 'active' && (
    <p className="mt-1 text-sm text-slate-400">
      {status.num_seats} {status.num_seats === 1 ? 'operario' : 'operarios'} ·{' '}
      <strong className="text-slate-200">{status.precio_total}€/mes</strong>
    </p>
  )

const checkoutErrorMessage = (error) =>
  error.includes('503') || error.includes('configurado')
    ? 'Los pagos aún no están configurados. Contacta con soporte.'
    : error

const checkoutError = ({ error }) =>
  error && (
    <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
      {checkoutErrorMessage(error)}
    </p>
  )

const BillingStatusCard = () => {
  const {
    status,
    isLoadingStatus,
    refreshStatus,
    startCheckout,
    openPortal,
    isRedirecting,
    error,
  } = useBilling()

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  if (isLoadingStatus || !status) return null

  const badge = planBadge(status)

  return (
    <PanelCard>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          Plan y facturación
        </h2>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {trialSummary({ status })}
      {activeSummary({ status })}

      <WeldixButton
        variant={status.plan === 'active' ? 'ghost' : 'warning'}
        size="md"
        onClick={status.plan === 'active' ? openPortal : startCheckout}
        isLoading={isRedirecting}
        loadingLabel="Redirigiendo…"
        className="mt-3 w-full"
      >
        {status.plan === 'active' ? 'Gestionar suscripción' : 'Activar suscripción'}
      </WeldixButton>

      {checkoutError({ error })}
    </PanelCard>
  )
}

export default BillingStatusCard
