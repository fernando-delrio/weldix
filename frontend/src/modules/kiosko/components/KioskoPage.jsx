import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

import useKiosko from '../hooks/useKiosko'

// ── Helpers ────────────────────────────────────────────────────────────────
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

const formatHora = (iso) => {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const accionConfig = {
  entrada: {
    label: 'Entrada registrada',
    cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    icon: 'bx-log-in',
  },
  salida: {
    label: 'Salida registrada',
    cls: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    icon: 'bx-log-out',
  },
}

// ── Guard states (CLAUDE.md §7) ──────────────────────────────────────────────
const loadingState = ({ isLoading }) =>
  isLoading && (
    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
      Cargando kiosko…
    </p>
  )

const invalidState = ({ isLoading, loadError }) =>
  !isLoading &&
  loadError && (
    <div className="rounded-2xl border border-rose-700/40 bg-rose-900/20 px-8 py-6 text-center">
      <i className="bx bx-error-circle mb-2 block text-4xl text-rose-400" aria-hidden="true" />
      <p className="text-lg font-bold text-rose-300">Kiosko no válido</p>
      <p className="mt-1 text-sm text-slate-500">Pide a tu administrador un enlace nuevo.</p>
    </div>
  )

// ── Feedback (confirmación / error de fichaje) ───────────────────────────────
const feedbackBanner = ({ result, error }) => {
  if (error) {
    return (
      <div className="rounded-xl border border-rose-700/40 bg-rose-900/20 px-5 py-4 text-center">
        <p className="text-base font-bold text-rose-300">{error}</p>
      </div>
    )
  }
  if (result) {
    const cfg = accionConfig[result.accion] ?? accionConfig.entrada
    return (
      <div className={`rounded-xl border px-5 py-4 text-center ${cfg.cls}`}>
        <p className="text-lg font-bold">
          <i className={`bx ${cfg.icon} mr-2`} aria-hidden="true" />
          {result.operario}
        </p>
        <p className="mt-0.5 text-sm">
          {cfg.label} a las {formatHora(result.hora)}
          {result.horas != null && ` · ${result.horas} h`}
        </p>
      </div>
    )
  }
  return <p className="text-sm text-slate-600">Introduce tu PIN y pulsa FICHAR</p>
}

// ── Componente principal ─────────────────────────────────────────────────────
const KioskoPage = () => {
  const { token } = useParams()
  const state = useKiosko(token)
  const { info, input, submitting, pressDigit, backspace, clearInput, submit } = state

  // Soporte de teclado físico — para talleres que ponen un PC fijo en la
  // entrada en vez de una tablet táctil. El teclado numérico y el de fila
  // superior mandan el mismo dígito en `e.key`, así que no hace falta
  // distinguirlos.
  useEffect(() => {
    if (!info) return undefined
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        pressDigit(e.key)
      } else if (e.key === 'Backspace') {
        backspace()
      } else if (e.key === 'Escape') {
        clearInput()
      } else if (e.key === 'Enter' && input && !submitting) {
        submit()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [info, input, submitting, pressDigit, backspace, clearInput, submit])

  const keyBtn =
    'flex h-16 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 text-2xl font-bold text-slate-100 transition active:scale-95 active:bg-slate-700 sm:h-20 sm:text-3xl'

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-8">
      {loadingState(state) ||
        invalidState(state) ||
        (info && (
          <div className="w-full max-w-sm space-y-6">
            {/* Cabecera */}
            <div className="text-center">
              <p className="text-2xl font-extrabold tracking-[0.16em] text-amber-500">WELDIX</p>
              <h1 className="mt-1 text-lg font-semibold text-slate-200">{info.tenant_nombre}</h1>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Fichaje de jornada
              </p>
            </div>

            {/* Display del PIN — enmascarado por privacidad en la tablet compartida */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Tu PIN
              </p>
              <p className="mt-1 h-10 text-4xl font-black tracking-[0.35em] text-slate-100">
                {input ? '•'.repeat(input.length) : <span className="text-slate-700">••••</span>}
              </p>
            </div>

            {feedbackBanner(state)}

            {/* Teclado numérico */}
            <div className="grid grid-cols-3 gap-2.5">
              {KEYS.map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => pressDigit(digit)}
                  className={keyBtn}
                  aria-label={`Número ${digit}`}
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={clearInput}
                className={`${keyBtn} text-base text-rose-300`}
                aria-label="Borrar todo"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => pressDigit('0')}
                className={keyBtn}
                aria-label="Número 0"
              >
                0
              </button>
              <button
                type="button"
                onClick={backspace}
                className={`${keyBtn} text-2xl`}
                aria-label="Borrar último dígito"
              >
                <i className="bx bx-arrow-back" aria-hidden="true" />
              </button>
            </div>

            {/* Botón fichar */}
            <button
              type="button"
              onClick={submit}
              disabled={!input || submitting}
              aria-busy={submitting}
              className="h-16 w-full rounded-xl bg-amber-500 text-lg font-black uppercase tracking-[0.14em] text-slate-950 transition active:scale-[0.98] hover:bg-amber-400 disabled:opacity-40"
            >
              {submitting ? 'Fichando…' : 'Fichar'}
            </button>
          </div>
        ))}
    </main>
  )
}

export default KioskoPage
