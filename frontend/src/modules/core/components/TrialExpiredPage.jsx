import { Link } from 'react-router-dom'

const FEATURES = [
  { icon: 'bx bx-list-check', label: 'OTs ilimitadas' },
  { icon: 'bx bx-time-five',  label: 'Control de fichaje' },
  { icon: 'bx bx-package',    label: 'Gestión de stock' },
  { icon: 'bx bx-group',      label: 'RRHH completo' },
  { icon: 'bx bx-wrench',     label: 'GMAO — Equipos' },
  { icon: 'bx bx-bot',        label: 'IA especializada' },
]

const FeaturePill = ({ icon, label }) => (
  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
    <i className={`${icon} text-sky-400 text-base`} />
    {label}
  </div>
)

const TrialExpiredPage = () => (
  <main className="grid min-h-screen place-items-center bg-slate-950 px-6">
    <div className="mx-auto w-full max-w-lg space-y-8 text-center">

      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10">
          <i className="bx bx-lock-alt text-3xl text-rose-400" />
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-black tracking-tight text-slate-100">
          Tu periodo de prueba ha terminado
        </h1>
        <p className="text-sm leading-relaxed text-slate-400">
          Activa tu suscripción para seguir gestionando tu taller sin interrupciones.
          Todos tus datos están guardados y seguros.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FEATURES.map((f) => <FeaturePill key={f.label} {...f} />)}
      </div>

      <div className="space-y-3">
        {/* CTA principal — cuando Stripe esté listo apuntará a /billing/checkout */}
        <a
          href="mailto:hola@weldix.app?subject=Activar%20suscripcion"
          className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition"
        >
          <i className="bx bx-envelope text-lg" />
          Contactar para activar plan
        </a>
        <Link
          to="/login"
          className="block text-xs text-slate-600 hover:text-slate-400 transition"
        >
          Volver al inicio de sesión
        </Link>
      </div>

    </div>
  </main>
)

export default TrialExpiredPage
