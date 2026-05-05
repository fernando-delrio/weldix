import { Link, useSearchParams } from 'react-router-dom'
import { useBilling } from '../../billing/hooks/useBilling'

const FEATURES = [
  { icon: 'bx bx-list-check', label: 'OTs ilimitadas' },
  { icon: 'bx bx-time-five', label: 'Control de fichaje' },
  { icon: 'bx bx-package', label: 'Gestión de stock' },
  { icon: 'bx bx-group', label: 'RRHH completo' },
  { icon: 'bx bx-wrench', label: 'GMAO — Equipos' },
  { icon: 'bx bx-bot', label: 'IA especializada' },
]

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '29',
    desc: 'Hasta 5 operarios',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '59',
    desc: 'Operarios ilimitados + IA',
    highlight: true,
  },
]

const FeaturePill = ({ icon, label }) => (
  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
    <i className={`${icon} text-amber-400 text-base`} />
    {label}
  </div>
)

const PlanCard = ({ plan, onSelect, isLoading }) => (
  <button
    type="button"
    onClick={() => onSelect(plan.id)}
    disabled={isLoading}
    className={[
      'relative flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all',
      'disabled:opacity-60 disabled:cursor-not-allowed',
      plan.highlight
        ? 'border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20'
        : 'border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800',
    ].join(' ')}
  >
    {plan.highlight && (
      <span className="absolute -top-2.5 left-4 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-950">
        Recomendado
      </span>
    )}
    <span className="font-black text-slate-100">{plan.name}</span>
    <span className="text-2xl font-black text-slate-100">
      {plan.price}€<span className="text-sm font-normal text-slate-400">/mes</span>
    </span>
    <span className="text-xs text-slate-400">{plan.desc}</span>
  </button>
)

const SuccessBanner = () => (
  <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
    <i className="bx bx-check-circle text-xl text-emerald-400" />
    <p className="text-sm font-semibold text-emerald-300">
      ¡Suscripción activada! Redirigiendo a tu taller...
    </p>
  </div>
)

const TrialExpiredPage = () => {
  const { startCheckout, isRedirecting, error } = useBilling()
  const [searchParams] = useSearchParams()
  const justCancelled = searchParams.get('cancelled') === '1'
  const justSucceeded = searchParams.get('subscription') === 'success'

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 py-12">
      <div className="mx-auto w-full max-w-lg space-y-8 text-center">
        {/* Icono */}
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10">
            <i className="bx bx-lock-alt text-3xl text-rose-400" />
          </div>
        </div>

        {/* Título */}
        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight text-slate-100">
            {justCancelled ? 'El pago fue cancelado' : 'Tu periodo de prueba ha terminado'}
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            {justCancelled
              ? 'No se ha realizado ningún cargo. Elige un plan cuando quieras para continuar.'
              : 'Todos tus datos están guardados y seguros. Activa tu suscripción para seguir gestionando tu taller.'}
          </p>
        </div>

        {/* Banner de éxito si viene de Stripe con success */}
        {justSucceeded && <SuccessBanner />}

        {/* Features */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <FeaturePill key={f.label} {...f} />
          ))}
        </div>

        {/* Planes */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Elige tu plan
          </p>
          <div className="grid grid-cols-2 gap-3">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onSelect={startCheckout}
                isLoading={isRedirecting}
              />
            ))}
          </div>
        </div>

        {/* Error de Stripe */}
        {error && (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
            {error.includes('503') || error.includes('configurado')
              ? 'Los pagos aún no están configurados. Contacta con soporte.'
              : error}
          </p>
        )}

        {/* Spinner mientras redirige */}
        {isRedirecting && (
          <p className="text-sm text-slate-400">
            <i className="bx bx-loader-alt animate-spin mr-1" />
            Conectando con Stripe...
          </p>
        )}

        {/* Fallback: contacto directo */}
        <div className="space-y-2 border-t border-slate-800 pt-6">
          <p className="text-xs text-slate-600">¿Prefieres hablar con nosotros primero?</p>
          <div className="flex justify-center gap-4">
            <a
              href="mailto:hola@weldix.app?subject=Activar%20suscripcion"
              className="text-xs text-slate-500 hover:text-amber-400 transition"
            >
              <i className="bx bx-envelope mr-1" />
              hola@weldix.app
            </a>
            <a
              href="https://wa.me/34600000000?text=Quiero%20activar%20mi%20suscripci%C3%B3n%20en%20Weldix"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-amber-400 transition"
            >
              <i className="bx bxl-whatsapp mr-1" />
              WhatsApp
            </a>
          </div>
        </div>

        <Link to="/login" className="block text-xs text-slate-700 hover:text-slate-500 transition">
          Volver al inicio de sesión
        </Link>
      </div>
    </main>
  )
}

export default TrialExpiredPage
