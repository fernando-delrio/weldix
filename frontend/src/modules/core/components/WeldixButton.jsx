import { cx } from '../lib/cx'

// ── Strategy: variant → clases visuales ──────────────────────────────────────
// Añadir un variant nuevo = una línea aquí, cero cambios en componentes existentes (OCP)
const VARIANT = {
  primary:
    'border border-sky-500/50     bg-sky-500/10     text-sky-300     hover:border-sky-400/70     hover:bg-sky-500/20     focus-visible:outline-sky-400',
  secondary:
    'border border-slate-600/60   bg-slate-800/60   text-slate-300   hover:border-slate-500      hover:bg-slate-700/60   focus-visible:outline-slate-400',
  danger:
    'border border-rose-500/50    bg-rose-500/10    text-rose-300    hover:border-rose-400/70    hover:bg-rose-500/20    focus-visible:outline-rose-400',
  success:
    'border border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400/70 hover:bg-emerald-500/20 focus-visible:outline-emerald-400',
  warning:
    'border border-amber-500/50   bg-amber-500/10   text-amber-300   hover:border-amber-400/70   hover:bg-amber-500/20   focus-visible:outline-amber-400',
  ghost:
    'border border-transparent                      text-slate-400   hover:text-slate-200        hover:bg-slate-800/40   focus-visible:outline-slate-400',
}

// ── Strategy: size → clases de espacio y altura mínima ───────────────────────
// WCAG 2.1 §2.5.5 — target size mínimo 44×44 px en interactivos (aquí usamos 44 como mínimo,
// 48 para `lg` que es el tamaño recomendado en contexto táctil de taller)
const SIZE = {
  sm: 'min-h-[36px]  px-2.5 py-1    text-[0.62rem]',
  md: 'min-h-[44px]  px-4   py-2    text-[0.7rem]',
  lg: 'min-h-[48px]  px-6   py-2.5  text-sm',
  // icon: el tamaño lo pone el padre (w-11 h-11 = 44px). aria-label obligatorio.
  icon: 'min-h-[44px]  min-w-[44px] p-0',
}

// Base común a todos los botones
const BASE = [
  'inline-flex items-center justify-center gap-2',
  'rounded-xl font-bold uppercase tracking-[0.14em]',
  'transition',
  // Focus ring siempre visible (no outline:none sin alternativa — CLAUDE.md §10.3)
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
  // Disabled: sin eventos de puntero, opacidad y cursor explicativo
  'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ')

// ── Spinner ───────────────────────────────────────────────────────────────────
// aria-hidden porque el estado de carga se comunica vía aria-busy + aria-label
const Spinner = () => (
  <svg
    className="h-3.5 w-3.5 animate-spin shrink-0"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
)

/**
 * WeldixButton — botón accesible compartido para toda la app.
 *
 * Props:
 *   variant        'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost'
 *   size           'sm' | 'md' | 'lg' | 'icon'
 *   isLoading      bool — muestra spinner + bloquea interacción
 *   loadingLabel   string — texto que el lector de pantalla anuncia mientras carga
 *                           (reemplaza el "..." que no tiene significado para SR)
 *   aria-label     string — OBLIGATORIO cuando size='icon' o children es solo icono
 *   type           'button' | 'submit' | 'reset'  (default: 'button')
 *   disabled       bool
 *   className      string — clases adicionales (ancho, margen, etc.)
 *   ...props       cualquier atributo HTML válido de <button> (onClick, aria-pressed, etc.)
 */
const WeldixButton = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingLabel = 'Cargando…',
  type = 'button',
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  ...props
}) => {
  const isDisabled = disabled || isLoading

  // Aviso en desarrollo: botón icon sin aria-label es inaccesible
  if (
    import.meta.env.MODE !== 'production' &&
    size === 'icon' &&
    !ariaLabel &&
    !props['aria-labelledby']
  ) {
    console.warn(
      '[WeldixButton] size="icon" requiere aria-label o aria-labelledby para ser accesible.'
    )
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      // aria-disabled permite que los lectores de pantalla anuncien el estado
      // aunque disabled ya bloquea la interacción
      aria-disabled={isDisabled || undefined}
      // aria-busy indica que hay una operación en curso (mejor que solo opacity)
      aria-busy={isLoading || undefined}
      // Cuando carga, el aria-label sobreescribe el texto visible para el SR
      // — evita que anuncie "..." o el spinner SVG como contenido
      aria-label={isLoading ? loadingLabel : ariaLabel}
      className={cx(BASE, VARIANT[variant], SIZE[size], className)}
      {...props}
    >
      {isLoading && <Spinner />}
      {children}
    </button>
  )
}

export default WeldixButton
