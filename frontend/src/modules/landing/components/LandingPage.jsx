import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'

// Alias en JS puro → ESLint detecta el uso de `motion` fuera de JSX
const MotionDiv = motion.div
// motion(Link): un <Link> normal no entiende `variants`/`animate` — hace
// falta envolverlo con motion() para que la CTA final pueda animar su glow.
const MotionLink = motion(Link)
import { cx } from '../../core/lib/cx'
import DemoPreview from '../../core/components/DemoPreview'
import MagneticWrap from './MagneticWrap'
import WordReveal from '../../core/components/WordReveal'
import RotatingBadge from '../../core/components/RotatingBadge'

// ─── datos ────────────────────────────────────────────────────────────────────

const PAIN_POINTS = [
  { icon: 'bx bx-file-blank', text: 'Partes en papel que se pierden o se mojan' },
  { icon: 'bx bx-spreadsheet', text: 'Excel con fórmulas que nadie entiende' },
  { icon: 'bx bx-time', text: 'Calcular horas a mano cada fin de mes' },
  { icon: 'bx bx-confused', text: 'No saber qué OT lleva quién en este momento' },
  { icon: 'bx bx-receipt', text: 'Albaranes de proveedor que tarda 30 min en transcribir' },
  { icon: 'bx bx-search-alt', text: 'Sin saber si el material que necesitas está en el almacén' },
]

const TRUST_METRICS = [
  { v: '100%', l: 'cumplimiento RDL 8/2019', icon: 'bx bx-shield-check' },
  { v: '< 5 min', l: 'para empezar a usar', icon: 'bx bx-rocket' },
  { v: '0 €', l: 'tarjeta requerida', icon: 'bx bx-credit-card' },
  { v: '15 días', l: 'prueba completamente gratis', icon: 'bx bx-gift' },
]

const TIMELINE_STEPS = [
  {
    when: 'Hoy',
    icon: 'bx bx-store',
    title: 'Te registras',
    desc: '30 segundos. Sin tarjeta. Sin instalar nada.',
  },
  {
    when: 'En 5 minutos',
    icon: 'bx bx-list-check',
    title: 'Primera OT creada',
    desc: 'Código automático, cliente, asignación al operario.',
  },
  {
    when: 'Esta semana',
    icon: 'bx bx-time-five',
    title: 'Todo el equipo ficha',
    desc: 'Desde el móvil, sin App Store. Cumplimiento legal.',
  },
  {
    when: 'Este mes',
    icon: 'bx bx-bar-chart-alt-2',
    title: 'Cero papel',
    desc: 'Stock, RRHH, equipos y OTs, todo en una pantalla.',
  },
]

// Precios actualizados — base + por operario
const PRECIO_BASE = 49
const PRECIO_POR_OPERARIO = 17

const PLAN_INCLUDES = [
  'OTs ilimitadas',
  'Control de fichaje (RDL 8/2019)',
  'Stock + albaranes con IA',
  'RRHH completo + nóminas',
  'IA especializada en tu taller',
  'Soporte incluido',
]

const PLAN_EXAMPLES = [
  { ops: 2, total: PRECIO_BASE + 2 * PRECIO_POR_OPERARIO },
  { ops: 5, total: PRECIO_BASE + 5 * PRECIO_POR_OPERARIO },
  { ops: 10, total: PRECIO_BASE + 10 * PRECIO_POR_OPERARIO },
]

// ─── theme toggle ─────────────────────────────────────────────────────────────

export const ThemeToggle = ({ isDark, onToggle, t }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
    className={cx('flex h-8 w-8 items-center justify-center rounded-sm transition', t.toggleBg)}
  >
    {isDark ? (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
        />
      </svg>
    ) : (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
        />
      </svg>
    )}
  </button>
)

// ─── hero — pain first ────────────────────────────────────────────────────────

export const HeroSection = ({ t, isDark }) => (
  <section
    data-gsap="hero-section"
    className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 pb-16 pt-28"
  >
    {/* Gradiente animado — vivo, cambia de posición suavemente */}
    <div
      className="landing-hero-gradient-anim pointer-events-none absolute inset-0"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(56,189,248,0.04) 33%, rgba(245,158,11,0.06) 66%, rgba(139,92,246,0.03) 100%)'
          : 'linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(56,189,248,0.03) 33%, rgba(245,158,11,0.05) 66%, transparent 100%)',
      }}
    />

    {/* RotatingBadge decorativo — flotante top-right, solo desktop */}
    <div className="pointer-events-none absolute right-8 top-28 hidden opacity-60 lg:block">
      <RotatingBadge
        size={90}
        className={t.accent}
        text="✦ GRATIS 15 DÍAS ✦ SIN TARJETA"
        speed={16}
      />
    </div>

    <div className="mx-auto flex w-full max-w-6xl flex-col lg:flex-row lg:items-center lg:gap-20">
      <div className="relative z-10 flex-1 space-y-7 lg:max-w-2xl">
        {/* Badge — animado con Framer Motion (reemplaza GSAP hero-badge) */}
        <MotionDiv
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={cx('inline-flex items-center gap-2 rounded-full border px-4 py-1.5', t.pill)}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          <span className="text-[11px] font-medium uppercase tracking-[0.1em]">
            Talleres de soldadura · calderería · metal
          </span>
        </MotionDiv>

        {/* Headline — WordReveal reemplaza los data-gsap="hero-line" */}
        <div className="space-y-4">
          <h1 className="font-display text-[3.4rem] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[4.6rem] lg:text-[5.4rem]">
            <WordReveal text="¿Sigues con" className={cx('block', t.headline)} initialDelay={0} />
            <WordReveal
              text="papel y Excel"
              className={cx('block', t.headlineAccent)}
              initialDelay={0.3}
            />
            <WordReveal
              text="en tu taller?"
              className={cx('block', t.headline)}
              initialDelay={0.6}
            />
          </h1>
          <div data-gsap="hero-bar" className={cx('h-[2px] w-16 rounded-full', t.accentBg)} />
        </div>

        <p data-gsap="hero-sub" className={cx('max-w-lg text-[1.05rem] leading-relaxed', t.muted)}>
          Cada hora perdida con papeleo es dinero que no cobras. Weldix digitaliza tu taller en 5
          minutos, sin instalar nada.
        </p>

        {/* CTAs envueltos en MagneticWrap */}
        <div className="flex flex-wrap gap-3">
          <MagneticWrap strength={0.3}>
            <Link
              to="/registro"
              data-gsap="hero-cta"
              className={cx(
                'flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold tracking-wide shadow-lg transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2',
                isDark
                  ? 'focus-visible:ring-offset-[#070b0f]'
                  : 'focus-visible:ring-offset-[#f1f5f9]',
                t.btnPrimary
              )}
            >
              <i className="bx bx-rocket text-base" />
              Probar 15 días gratis
            </Link>
          </MagneticWrap>
          <MagneticWrap strength={0.25}>
            <Link
              to="/demo"
              data-gsap="hero-cta"
              className={cx(
                'flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold tracking-wide shadow-lg transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2',
                isDark
                  ? 'focus-visible:ring-offset-[#070b0f]'
                  : 'focus-visible:ring-offset-[#f1f5f9]',
                t.btnGhost
              )}
            >
              <i className="bx bx-play-circle text-base" />
              Ver demo
            </Link>
          </MagneticWrap>
        </div>

        <p className={cx('text-[0.62rem] font-semibold uppercase tracking-[0.18em]', t.faint)}>
          Sin compromiso · Sin tarjeta · Sin instalación
        </p>
      </div>

      {/* Right — mockup */}
      <div
        data-gsap="hero-mockup"
        className="relative z-10 mt-14 w-full max-w-md lg:mt-0 lg:max-w-xl"
      >
        <DemoPreview t={t} isDark={isDark} />
        <div
          className={cx(
            'mt-2 flex items-center gap-2 font-mono text-[0.52rem] uppercase tracking-widest',
            t.monoMuted
          )}
        >
          <span className={cx('h-px flex-1', t.divider)} />
          preview · taller demo
          <span className={cx('h-px flex-1', t.divider)} />
        </div>
      </div>
    </div>
  </section>
)

// ─── pain points ──────────────────────────────────────────────────────────────
//
// Bento deliberado, no un accidente: PAIN_POINTS tiene 6 elementos + el cierre
// ("Weldix es para ti") como 7º. En una grid de 3 columnas, la primera tarjeta
// grande (2 cols) + 1 normal llenan la fila 1; 3 normales llenan la fila 2;
// 1 normal + el cierre grande (2 cols) llenan la fila 3. Sin huecos sueltos.
// La primera y la de cierre no solo ocupan más ancho: llevan icono más grande,
// texto más grande y más padding, así el peso visual es real, no solo de grid.
//
// Motion en vez de GSAP: es "aparece al entrar en viewport", no scroll-hijack
// ni pin — el patrón más simple gana. reversible (whileInView sin once:true):
// al bajar aparecen, al subir vuelven a su estado inicial — es literalmente
// scroll, no un "ya lo vi una vez y ya está".
const painCardSpan = (index) => (index === 0 ? 'sm:col-span-2 lg:col-span-2' : 'lg:col-span-1')

const painContainerVariants = {
  hidden: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

// Entrada con spring sutil (bounce 0.16-0.2): un toque de vida, no un rebote
// de juguete — esta sección es más humana que la de métricas legales, admite
// algo de personalidad. La salida (scroll hacia arriba) es rápida y sin
// spring: "slow where deciding, fast where responding" — aquí el sistema
// solo está respondiendo al gesto de subir, no hay nada que decidir.
const painCardVariants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.94,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', duration: 0.5, bounce: 0.16 },
  },
}

const painClosingVariants = {
  hidden: {
    opacity: 0,
    y: 28,
    scale: 0.92,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', duration: 0.6, bounce: 0.22 },
  },
}

// prefers-reduced-motion: sin desplazamiento ni escala ni spring, solo un
// fade corto — se conserva el orden de aparición (sigue contando la misma
// historia) pero sin el movimiento que esa preferencia pide evitar.
const painReducedVariants = {
  hidden: { opacity: 0, transition: { duration: 0.15 } },
  visible: { opacity: 1, transition: { duration: 0.3 } },
}

export const PainSection = ({ t }) => {
  const prefersReducedMotion = useReducedMotion()
  const cardVariants = prefersReducedMotion ? painReducedVariants : painCardVariants
  const closingVariants = prefersReducedMotion ? painReducedVariants : painClosingVariants

  return (
    <section
      className={cx('border-y px-6 py-16 transition-colors duration-300', t.divider, t.painBg)}
    >
      <div className="mx-auto max-w-6xl">
        <p
          className={cx(
            'mb-8 text-center font-mono text-sm font-bold uppercase tracking-[0.2em]',
            t.painText
          )}
        >
          // ¿te suena esto?
        </p>
        <MotionDiv
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          variants={painContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.25 }}
        >
          {PAIN_POINTS.map(({ icon, text }, index) => {
            const isLead = index === 0
            return (
              <MotionDiv
                key={text}
                variants={cardVariants}
                className={cx(
                  'flex items-start gap-3 rounded-xl border',
                  isLead ? 'p-5' : 'p-4',
                  t.painBorder,
                  painCardSpan(index)
                )}
              >
                <i
                  className={cx(
                    icon,
                    'mt-0.5 shrink-0',
                    isLead ? 'text-2xl' : 'text-lg',
                    t.painText
                  )}
                />
                <p className={cx('leading-relaxed', isLead ? 'text-base' : 'text-sm', t.muted)}>
                  {text}
                </p>
              </MotionDiv>
            )
          })}

          {/* El cierre ya no es texto plano debajo del grid: es la 7ª pieza
              del bento, ocupa 2 columnas como la primera, y usa el acento
              ámbar (no el rosa de "dolor") para marcar que aquí cambia el
              registro: de problema a solución. Icono + texto más grandes que
              el resto — es el remate de la sección, tiene que pesar más. */}
          <MotionDiv
            variants={closingVariants}
            className={cx(
              'flex items-center justify-center gap-3 rounded-xl border p-5 text-center sm:col-span-2 lg:col-span-2',
              t.accentBorder,
              t.accentTint
            )}
          >
            <i className={cx('bx bx-check-circle shrink-0 text-2xl', t.accent)} />
            <p className={cx('text-base font-bold sm:text-lg', t.headline)}>
              Si has dicho sí a alguno de estos,{' '}
              <span className={t.accent}>Weldix es para ti.</span>
            </p>
          </MotionDiv>
        </MotionDiv>
      </div>
    </section>
  )
}

// ─── trust metrics ────────────────────────────────────────────────────────────

export const TrustMetricsBar = ({ t, isDark }) => (
  <section
    className={cx('border-b px-6 py-12 transition-colors duration-300', t.divider, t.sectionAlt)}
  >
    <div className="mx-auto max-w-6xl">
      <div
        className={cx(
          'grid grid-cols-2 divide-y lg:grid-cols-4 lg:divide-y-0 lg:divide-x',
          isDark ? 'divide-slate-800' : 'divide-stone-200'
        )}
      >
        {TRUST_METRICS.map(({ v, l, icon }) => (
          <div
            key={l}
            data-gsap="trust-item"
            className="flex flex-col items-center gap-2 p-6 text-center"
          >
            <i className={cx(icon, 'text-2xl', t.accent)} />
            <div className={cx('text-2xl font-black', t.accent)}>{v}</div>
            <div
              className={cx('text-[0.65rem] font-semibold uppercase tracking-[0.12em]', t.muted)}
            >
              {l}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ─── timeline — inspirado en Deel ────────────────────────────────────────────

export const TimelineSection = ({ t }) => (
  <section
    id="como-funciona"
    data-gsap="timeline-section"
    className={cx('scroll-mt-24 px-6 py-24 transition-colors duration-300', t.sectionAlt)}
  >
    <div className="mx-auto max-w-6xl">
      <div className={cx('mb-14 border-b pb-8', t.divider)}>
        <p className={cx('mb-3 text-[11px] font-medium uppercase tracking-[0.12em]', t.accent)}>
          Cómo funciona
        </p>
        <h2
          className={cx(
            'font-display text-3xl font-extrabold tracking-tight sm:text-4xl',
            t.headline
          )}
        >
          De cero a taller digital.
          <br />
          Sin complicaciones.
        </h2>
      </div>

      {/* Timeline horizontal en desktop, vertical en mobile */}
      <div className="relative">
        {/* Línea horizontal — solo desktop */}
        <div
          className={cx(
            'absolute left-0 right-0 top-[2.25rem] hidden h-px lg:block',
            t.timelineLine
          )}
        />
        <div
          data-gsap="timeline-progress"
          className="absolute left-0 right-0 top-[2.25rem] hidden h-px bg-amber-500 lg:block"
          style={{ transformOrigin: 'left center' }}
        />

        <div className="grid gap-10 lg:grid-cols-4 lg:gap-6">
          {TIMELINE_STEPS.map(({ when, icon, title, desc }, i) => (
            <div
              key={when}
              data-gsap="timeline-step"
              className="relative flex gap-5 lg:flex-col lg:gap-4"
            >
              {/* Dot */}
              <div
                className={cx(
                  'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2',
                  t.timelineDot
                )}
              >
                <i className={cx(icon, 'text-sm text-white')} />
              </div>
              {/* Línea vertical — solo mobile */}
              {i < TIMELINE_STEPS.length - 1 && (
                <div
                  className={cx(
                    'absolute left-[1.1rem] top-9 h-full w-px lg:hidden',
                    t.timelineLine
                  )}
                />
              )}
              <div className="space-y-1 pb-10 lg:pb-0">
                <p
                  className={cx(
                    'font-mono text-[0.55rem] font-black uppercase tracking-[0.18em]',
                    t.accent
                  )}
                >
                  {when}
                </p>
                <h3 className="text-sm font-black uppercase tracking-wide">{title}</h3>
                <p className={cx('text-xs leading-relaxed', t.muted)}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={cx('mt-14 border-t pt-10 text-center', t.divider)}>
        <Link
          to="/registro"
          className={cx(
            'inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold tracking-wide shadow-lg transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2',
            t.btnPrimary
          )}
        >
          <i className="bx bx-rocket" />
          Probar 15 días gratis
        </Link>
      </div>
    </div>
  </section>
)

// ─── precios ──────────────────────────────────────────────────────────────────

export const PricingSection = ({ t }) => (
  <section
    id="precios"
    className={cx('scroll-mt-24 px-6 py-24 transition-colors duration-300', t.sectionAlt)}
  >
    <div className="mx-auto max-w-6xl">
      <div
        className={cx(
          'mb-12 flex flex-col justify-between gap-4 border-b pb-8 sm:flex-row sm:items-end',
          t.divider
        )}
      >
        <div>
          <p className={cx('mb-3 text-[11px] font-medium uppercase tracking-[0.12em]', t.accent)}>
            Precios
          </p>
          <h2
            className={cx(
              'font-display text-3xl font-extrabold tracking-tight sm:text-4xl',
              t.headline
            )}
          >
            Sin sorpresas. <span className="font-light opacity-40">Sin letra pequeña.</span>
          </h2>
        </div>
        <p className={cx('hidden text-right text-xs leading-relaxed', t.muted)}>
          15 días de prueba gratuita.
          <br />
          Sin tarjeta de crédito.
        </p>
      </div>

      <div className="mx-auto max-w-3xl">
        {/* Tarjeta de precio único — glow-pulse-amber se aplica via CSS keyframe (sin JS).
            overflow-hidden en la tarjeta (no rounded-t-2xl en la barra): un radio de
            16px no cabe en una franja de 2px de alto, así que redondear la propia
            barra la deforma en una curva que no coincide con la esquina real de la
            tarjeta. Dejar que la tarjeta recorte a sus hijos es lo que la encaja
            de verdad. box-shadow (el glow) no lo afecta: se pinta fuera de la caja,
            overflow-hidden solo recorta contenido y descendientes. */}
        <div
          data-gsap="plan-card"
          className={cx(
            'glow-pulse-amber relative overflow-hidden rounded-2xl border p-8',
            t.planPopular
          )}
        >
          <div className={cx('absolute inset-x-0 top-0 h-0.5', t.planPopLine)} />

          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className={cx('font-mono text-[0.52rem] uppercase tracking-[0.2em]', t.monoMuted)}>
                Un solo plan · Todo incluido
              </p>
              <h3 className="text-2xl font-black uppercase tracking-wider">Weldix Pro</h3>
              <span
                className={cx(
                  'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[0.52rem] font-black uppercase tracking-widest',
                  t.accentBg,
                  t.accentBgText
                )}
              >
                <i className="bx bx-star text-[0.7rem]" />
                Incluye todo
              </span>
            </div>
            {/* Fórmula de precio */}
            <div className="text-right">
              <p className={cx('text-[0.6rem] uppercase tracking-widest', t.muted)}>
                Base del sistema
              </p>
              <p className="text-4xl font-black">
                {PRECIO_BASE}€<span className={cx('text-base font-normal', t.muted)}>/mes</span>
              </p>
              <p className={cx('text-sm font-bold', t.accent)}>
                + {PRECIO_POR_OPERARIO}€ por operario/mes
              </p>
            </div>
          </div>

          {/* Ejemplos de precio */}
          <div
            className={cx(
              'mb-6 grid grid-cols-3 divide-x rounded-sm border',
              t.divider,
              'overflow-hidden'
            )}
          >
            {PLAN_EXAMPLES.map(({ ops, total }) => (
              <div key={ops} className="p-3 text-center">
                <p className={cx('text-xs font-bold', t.muted)}>{ops} operarios</p>
                <p className={cx('text-xl font-black', t.accent)}>{total}€</p>
                <p className={cx('text-[0.55rem] uppercase tracking-wider', t.muted)}>/ mes</p>
              </div>
            ))}
          </div>

          {/* Qué incluye */}
          <ul className="mb-8 grid gap-2 sm:grid-cols-2">
            {PLAN_INCLUDES.map((f) => (
              <li key={f} className={cx('flex items-start gap-2 text-xs', t.muted)}>
                <i className={cx('bx bx-check mt-px shrink-0 text-sm', t.accent)} />
                {f}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/registro"
              className={cx(
                'flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold tracking-wide transition shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2',
                t.btnPrimary
              )}
            >
              <i className="bx bx-rocket" />
              Probar 15 días gratis
            </Link>
            <a
              href="mailto:hola@weldix.es?subject=Consulta%20sobre%20Weldix"
              className={cx(
                'flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium tracking-wide transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2',
                t.btnGhost
              )}
            >
              <i className="bx bx-envelope" />
              Hablar con nosotros
            </a>
          </div>
        </div>

        <p
          className={cx(
            'mt-4 text-center text-[0.62rem] font-semibold uppercase tracking-[0.18em]',
            t.faint
          )}
        >
          Sin permanencia · Cancela cuando quieras · Precio final según operarios reales
        </p>
      </div>
    </div>
  </section>
)

// ─── cta final ────────────────────────────────────────────────────────────────
//
// Eco del cierre de Pain points ("Weldix es para ti") pero a escala de página
// entera: el remate definitivo. Reversible como el resto, pero MÁS calmado
// que Pain (sin spring, sin rebote) — este es el momento de decisión, tiene
// que transmitir seguridad, no diversión.

const ctaTextVariants = {
  hidden: { opacity: 0, y: 24, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const ctaTextVariantsReduced = {
  hidden: { opacity: 0, transition: { duration: 0.15 } },
  visible: { opacity: 1, transition: { duration: 0.3 } },
}

// El glow del botón se repite cada vez que la sección vuelve a entrar en
// viewport — refuerza "este es el botón" sin ser un bucle infinito molesto:
// dos pulsos y para.
const ctaGlowVariants = {
  hidden: { boxShadow: '0 0 0 0 rgba(245,158,11,0)' },
  visible: {
    boxShadow: [
      '0 0 0 0 rgba(245,158,11,0)',
      '0 0 32px 8px rgba(245,158,11,0.35)',
      '0 0 0 0 rgba(245,158,11,0)',
    ],
    transition: { duration: 1.3, repeat: 1, ease: 'easeInOut', delay: 0.45 },
  },
}

export const CtaSection = ({ t }) => {
  const prefersReducedMotion = useReducedMotion()
  const textVariants = prefersReducedMotion ? ctaTextVariantsReduced : ctaTextVariants

  return (
    <section
      className={cx('border-y px-6 py-28 text-center transition-colors duration-300', t.divider)}
    >
      <MotionDiv
        className="mx-auto max-w-2xl space-y-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.4 }}
      >
        <p
          className={cx('font-mono text-[0.58rem] font-bold uppercase tracking-[0.25em]', t.accent)}
        >
          Empieza hoy
        </p>
        <MotionDiv variants={textVariants}>
          <h2
            className={cx(
              'font-display text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl',
              t.headline
            )}
          >
            Tu taller,
            <br />
            <span className={t.accent}>en marcha hoy.</span>
          </h2>
        </MotionDiv>
        <MotionDiv variants={textVariants}>
          <p className={cx('mx-auto max-w-md text-sm leading-relaxed', t.muted)}>
            Gestiona tus OTs, fichajes y stock desde una sola plataforma. Olvídate del papel y del
            Excel para siempre.
          </p>
        </MotionDiv>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <MotionLink
            to="/registro"
            className={cx(
              'flex items-center gap-2 rounded-xl px-10 py-4 text-sm font-bold tracking-wide shadow-lg transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2',
              t.btnPrimary
            )}
            variants={prefersReducedMotion ? undefined : ctaGlowVariants}
          >
            <i className="bx bx-rocket text-lg" />
            Probar 15 días gratis
          </MotionLink>
        </div>
        <p className={cx('text-[0.62rem] font-semibold uppercase tracking-[0.18em]', t.faint)}>
          Sin compromiso · Sin tarjeta · Cancela cuando quieras
        </p>
      </MotionDiv>
    </section>
  )
}

// ─── footer ───────────────────────────────────────────────────────────────────

export const LandingFooter = ({ t, isDark }) => (
  <footer
    className={cx('border-t px-6 py-8 transition-colors duration-300', t.footerBg, t.divider)}
  >
    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
      <div className="flex items-center gap-2">
        <img
          src={isDark ? '/weldix-logo-white.svg' : '/weldix-logo.svg'}
          alt="Weldix"
          className="h-6 w-auto shrink-0 opacity-40 object-contain"
        />
      </div>
      <div
        className={cx(
          'flex items-center gap-6 text-[0.62rem] font-semibold uppercase tracking-[0.12em]',
          t.faint
        )}
      >
        <Link to="/privacidad" className="transition hover:opacity-100">
          Privacidad
        </Link>
        <Link to="/terminos" className="transition hover:opacity-100">
          Términos
        </Link>
        <a href="mailto:hola@weldix.es" className="transition hover:opacity-100">
          Contacto
        </a>
        <Link to="/login" className="transition hover:opacity-100">
          Acceder
        </Link>
      </div>
      <p className={cx('font-mono text-xs uppercase tracking-widest', t.monoMuted)}>
        © 2026 Weldix
      </p>
    </div>
  </footer>
)
