import { useParams } from 'react-router-dom'
import useSeguimiento from '../hooks/useSeguimiento'
import { cx } from '../../core/lib/cx'
import { useTheme } from '../../core/lib/ThemeContext'

const STEPS = [
  { key: 'pendiente', label: 'Recibido', step: 1 },
  { key: 'en_proceso', label: 'En proceso', step: 2 },
  { key: 'control', label: 'Control', step: 3 },
  { key: 'listo', label: 'Listo', step: 4 },
  { key: 'entregado', label: 'Entregado', step: 5 },
]

// ── Stepper horizontal ────────────────────────────────────────────────────────
const Stepper = ({ currentStep }) => (
  <ol className="flex w-full items-center">
    {STEPS.map((s, idx) => {
      const done = currentStep > s.step
      const active = currentStep === s.step
      const isLast = idx === STEPS.length - 1

      return (
        <li key={s.key} className={cx('flex items-center', !isLast && 'flex-1')}>
          {/* Nodo */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cx(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all',
                done && 'border-amber-500 bg-amber-500 text-white',
                active &&
                  'border-amber-500 bg-amber-500/15 text-amber-600 shadow-[0_0_0_4px_rgba(245,158,11,0.15)]',
                !done &&
                  !active &&
                  'border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600'
              )}
            >
              {done ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                s.step
              )}
            </div>
            <span
              className={cx(
                'hidden text-[10px] font-semibold sm:block',
                active ? 'text-amber-600' : done ? 'text-amber-500' : 'text-slate-400'
              )}
            >
              {s.label}
            </span>
          </div>
          {/* Línea conectora */}
          {!isLast && (
            <div
              className={cx(
                'mx-1 h-0.5 flex-1 transition-all sm:mx-2',
                done ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'
              )}
            />
          )}
        </li>
      )
    })}
  </ol>
)

// ── Barra de progreso ─────────────────────────────────────────────────────────
const ProgressBar = ({ value }) => (
  <div className="mt-4">
    <div className="mb-1.5 flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-500">Progreso del trabajo</span>
      <span className="text-xs font-bold text-amber-600">{value}%</span>
    </div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
      <div
        className="h-full rounded-full bg-amber-500 transition-all duration-700"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
)

// ── Estados de carga / error ──────────────────────────────────────────────────
const loadingState = ({ isLoading, job }) =>
  isLoading &&
  !job && (
    <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      <p className="text-sm">Buscando tu trabajo…</p>
    </div>
  )

const errorState = ({ error }) =>
  error && (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-500 dark:bg-rose-900/30">
        <svg
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{error}</p>
      <p className="text-xs text-slate-500">
        Comprueba que el enlace es correcto o contacta con el taller.
      </p>
    </div>
  )

// ── Componente principal ──────────────────────────────────────────────────────
const SeguimientoPage = () => {
  const { token } = useParams()
  const { job, isLoading, error, lastUpdated } = useSeguimiento(token)
  const { isDark } = useTheme()

  const fmtTime = (d) => d?.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header mínimo — usa var(--card-*) en vez de dark: para no chocar con
          la redefinición de la escala slate que hace el tema de la app (ver
          el bug del título más arriba: dark:bg-slate-900 se volvía blanco). */}
      <header
        className="border-b"
        style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)' }}
      >
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <img
            src={isDark ? '/weldix-logo-white.svg' : '/weldix-logo.svg'}
            alt="Weldix"
            className="h-8 w-auto object-contain"
          />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {loadingState({ isLoading, job })}
        {errorState({ error })}

        {job && (
          <div className="flex flex-col gap-6">
            {/* Cabecera del trabajo */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
                {job.code}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[var(--app-text)]">{job.titulo}</h1>
            </div>

            {/* Tarjeta de estado actual */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                Estado actual
              </p>
              <p className="text-xl font-bold text-amber-600">{job.estado_label}</p>

              {job.progreso > 0 && <ProgressBar value={job.progreso} />}
            </div>

            {/* Stepper */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-500">
                Progreso del pedido
              </p>
              <Stepper currentStep={job.estado_step} />
              {/* Labels en mobile — solo el actual */}
              <p className="mt-4 text-center text-sm font-semibold text-amber-600 sm:hidden">
                {STEPS.find((s) => s.step === job.estado_step)?.label}
              </p>
            </div>

            {/* Pie */}
            <p className="text-center text-xs text-slate-400">
              {lastUpdated
                ? `Actualizado a las ${fmtTime(lastUpdated)} · Se actualiza automáticamente`
                : 'Actualizando…'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default SeguimientoPage
