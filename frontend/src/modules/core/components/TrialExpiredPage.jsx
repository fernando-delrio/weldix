import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useBilling } from '../../billing/hooks/useBilling'

const PRECIO_BASE = 49
const PRECIO_POR_OPERARIO = 17

const FEATURES = [
  { icon: 'bx bx-list-check', label: 'OTs ilimitadas' },
  { icon: 'bx bx-time-five', label: 'Control de fichaje' },
  { icon: 'bx bx-package', label: 'Gestión de stock' },
  { icon: 'bx bx-group', label: 'RRHH completo' },
  { icon: 'bx bx-bot', label: 'IA especializada' },
  { icon: 'bx bx-qr', label: 'Escáner QR' },
  { icon: 'bx bxs-file-pdf', label: 'Nóminas digitales' },
]

const FeaturePill = ({ icon, label }) => (
  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
    <i className={`${icon} text-amber-400 text-base`} />
    {label}
  </div>
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

  // Calculadora de precio — solo orientativa, el backend cuenta los operarios reales
  const [numOperarios, setNumOperarios] = useState(3)
  const precioTotal = PRECIO_BASE + numOperarios * PRECIO_POR_OPERARIO

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
              ? 'No se ha realizado ningún cargo. Activa tu suscripción cuando quieras.'
              : 'Todos tus datos están guardados. Activa tu suscripción para continuar.'}
          </p>
        </div>

        {justSucceeded && <SuccessBanner />}

        {/* Features */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FEATURES.map((f) => (
            <FeaturePill key={f.label} {...f} />
          ))}
        </div>

        {/* Calculadora de precio */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900 p-6 space-y-5 text-left">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400 text-center">
            Precio de tu taller
          </p>

          {/* Desglose */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Acceso al sistema</span>
              <span className="font-semibold text-slate-100">{PRECIO_BASE}€/mes</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                {numOperarios} operario{numOperarios !== 1 ? 's' : ''} × {PRECIO_POR_OPERARIO}€
              </span>
              <span className="font-semibold text-slate-100">
                {numOperarios * PRECIO_POR_OPERARIO}€/mes
              </span>
            </div>
            <div className="border-t border-slate-700 pt-2 flex items-center justify-between">
              <span className="font-bold text-slate-100">Total</span>
              <span className="text-2xl font-black text-amber-400">
                {precioTotal}€<span className="text-sm font-normal text-slate-400">/mes</span>
              </span>
            </div>
          </div>

          {/* Slider de operarios */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <label htmlFor="slider-operarios">Calcula con tu equipo:</label>
              <span className="font-bold text-slate-300">
                {numOperarios} operario{numOperarios !== 1 ? 's' : ''}
              </span>
            </div>
            <input
              id="slider-operarios"
              type="range"
              min={1}
              max={50}
              value={numOperarios}
              onChange={(e) => setNumOperarios(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
            <div className="flex justify-between text-xs text-slate-600">
              <span>1</span>
              <span>25</span>
              <span>50</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 text-center">
            El precio final se calcula con los operarios reales de tu taller. Sin permanencia —
            cancela cuando quieras.
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={startCheckout}
          disabled={isRedirecting}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-black text-slate-950 transition hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isRedirecting ? (
            <>
              <i className="bx bx-loader-alt animate-spin mr-2" />
              Conectando con Stripe...
            </>
          ) : (
            'Activar suscripción'
          )}
        </button>

        {error && (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
            {error.includes('503') || error.includes('configurado')
              ? 'Los pagos aún no están configurados. Contacta con soporte.'
              : error}
          </p>
        )}

        {/* Contacto alternativo */}
        <div className="space-y-2 border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-600">¿Prefieres hablar con nosotros primero?</p>
          <a
            href="mailto:hola@weldix.es?subject=Activar%20suscripcion"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-400 transition"
          >
            <i className="bx bx-envelope" />
            hola@weldix.es
          </a>
        </div>

        <Link to="/login" className="block text-xs text-slate-700 hover:text-slate-500 transition">
          Volver al inicio de sesión
        </Link>
      </div>
    </main>
  )
}

export default TrialExpiredPage
