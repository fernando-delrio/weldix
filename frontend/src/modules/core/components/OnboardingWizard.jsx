import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteDemoData } from '../../admin/services/adminService'
import { cx } from '../lib/cx'

const STEPS = [
  {
    key: 'bienvenida',
    emoji: '⚒️',
    title: '¡Bienvenido a Weldix!',
    body: 'Tu taller está listo. En menos de 2 minutos tendrás todo configurado para empezar a gestionar tus órdenes de trabajo, stock y equipo.',
    action: null,
  },
  {
    key: 'trabajos',
    emoji: '📋',
    title: 'Crea tu primera OT',
    body: 'Desde "Trabajos" puedes crear órdenes de trabajo con código automático (ORD-YYYY-NNN), asignar operarios y seguir el estado en tiempo real.',
    action: { label: 'Ver trabajos', path: '/app/trabajos' },
  },
  {
    key: 'operarios',
    emoji: '👷',
    title: 'Añade a tu equipo',
    body: 'Ve al panel Admin > Usuarios y crea cuentas para tus operarios. Ellos ficharán su jornada y gestionarán sus trabajos desde el móvil.',
    action: { label: 'Ir a Admin', path: '/app/admin' },
  },
  {
    key: 'stock',
    emoji: '📦',
    title: 'Configura tu stock',
    body: 'Registra los materiales de tu taller con cantidad mínima. Weldix te avisará cuando algo esté por agotarse.',
    action: { label: 'Ver stock', path: '/app/stock' },
  },
  {
    key: 'listo',
    emoji: '✅',
    title: '¡Todo listo!',
    body: 'Ya puedes gestionar tu taller desde cualquier dispositivo. Si tienes dudas, el asistente IA (botón 🔧) está aquí para ayudarte.',
    action: null,
  },
]

const StepDot = ({ index, current }) => (
  <span
    className={cx(
      'h-1.5 rounded-full transition-all duration-300',
      index === current ? 'w-6 bg-amber-400' : 'w-1.5 bg-slate-700'
    )}
    aria-hidden="true"
  />
)

const OnboardingWizard = ({ onComplete }) => {
  const [step, setStep] = useState(0)
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanDone, setCleanDone] = useState(false)
  const navigate = useNavigate()

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const isFirst = step === 0

  const goNext = () => {
    if (isLast) {
      onComplete()
      return
    }
    setStep((s) => s + 1)
  }

  const goBack = () => setStep((s) => s - 1)

  const handleCleanDemo = async () => {
    setIsCleaning(true)
    try {
      await deleteDemoData()
      setCleanDone(true)
    } finally {
      setIsCleaning(false)
    }
  }

  const handleAction = () => {
    if (!current.action) return
    navigate(current.action.path)
    goNext()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding de Weldix"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-slate-500">
            Paso {step + 1} de {STEPS.length}
          </span>
          <button
            type="button"
            onClick={onComplete}
            className="text-xs text-slate-600 hover:text-slate-400 transition"
            aria-label="Saltar onboarding"
          >
            Saltar
          </button>
        </div>

        {/* Contenido */}
        <div className="space-y-4 px-6 py-6">
          <div className="text-4xl">{current.emoji}</div>
          <h2 className="text-lg font-bold text-slate-100">{current.title}</h2>
          <p className="text-sm leading-relaxed text-slate-400">{current.body}</p>

          {/* Botón de acción rápida (opcional) */}
          {current.action && (
            <button
              type="button"
              onClick={handleAction}
              className="mt-1 text-sm font-semibold text-amber-400 underline hover:text-amber-300 transition"
            >
              {current.action.label} →
            </button>
          )}

          {/* Último paso — botón para limpiar datos de demo */}
          {isLast && (
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
              <p className="text-xs text-slate-400 mb-2">
                Tu taller incluye datos de ejemplo para que puedas explorar la app. Puedes
                eliminarlos cuando estés listo para empezar con datos reales.
              </p>
              {cleanDone ? (
                <p className="text-xs font-semibold text-emerald-400">✓ Datos de demo eliminados</p>
              ) : (
                <button
                  type="button"
                  onClick={handleCleanDemo}
                  disabled={isCleaning}
                  className="text-xs font-semibold text-red-400 hover:text-red-300 transition disabled:opacity-50"
                >
                  {isCleaning ? 'Eliminando...' : 'Limpiar datos de demo'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer: dots + navegación */}
        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4">
          {/* Dots de progreso */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <StepDot key={i} index={i} current={step} total={STEPS.length} />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-800"
              >
                Atrás
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-amber-400 min-w-[72px]"
            >
              {isLast ? 'Empezar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingWizard
