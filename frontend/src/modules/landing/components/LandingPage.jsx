import { Link } from 'react-router-dom'
import { useTheme } from '../../core/lib/ThemeContext'
import { cx } from '../../core/lib/cx'
import { useLandingAnimations } from '../hooks/useLandingAnimations'
import DemoPreview from './DemoPreview'

// ─── sistema de tema ──────────────────────────────────────────────────────────

const T = {
  dark: {
    page: 'bg-[#070b0f] text-slate-100',
    headline: 'text-white',
    headlineAccent: 'text-amber-400',
    nav: 'border-slate-800/80 bg-[#070b0f]/95',
    navText: 'text-slate-400 hover:text-slate-100',
    card: 'border-slate-800 bg-[#0d1520]',
    cardHover: 'hover:border-amber-500/50 hover:bg-[#0f1926]',
    pill: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    accent: 'text-amber-400',
    accentBg: 'bg-amber-500',
    accentBgText: 'text-black',
    accentBorder: 'border-amber-500/40',
    accentTint: 'bg-amber-500/10',
    muted: 'text-slate-400',
    faint: 'text-slate-600',
    divider: 'border-slate-800',
    sectionAlt: 'bg-[#090e15]',
    btnPrimary: 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20',
    btnGhost: 'border border-slate-700 text-slate-300 hover:bg-slate-800',
    footerBg: 'bg-[#040608]',
    monoMuted: 'text-slate-600',
    gridColor: 'rgba(255,255,255,0.022)',
    glowLeft: 'rgba(245,158,11,0.10)',
    toggleBg: 'bg-slate-800 text-amber-400 hover:bg-slate-700',
    planPopular: 'border-amber-500/60 bg-[#0f1926]',
    planNormal: 'border-slate-800 bg-[#0d1520]',
    planPopLine: 'bg-amber-500',
    testimonial: 'border-slate-800 bg-[#0d1520]',
    quoteColor: 'text-amber-400/60',
    timelineLine: 'bg-slate-800',
    timelineDot: 'bg-amber-500 border-amber-500',
    timelineDotInner: 'bg-[#070b0f]',
    painBg: 'bg-[#090e15]',
    painBorder: 'border-rose-500/20',
    painText: 'text-rose-400',
  },
  light: {
    // NOTA: index.css invierte la escala slate en light mode.
    // slate-100 → #1a1510 (casi negro), slate-950 → #f2ebe0 (crema, invisible).
    // Usar slate-100/200/300/400 para texto oscuro legible.
    page: 'bg-[#f5f0e8] text-slate-300',
    headline: 'text-slate-100',
    headlineAccent: 'text-amber-600',
    nav: 'border-stone-300 bg-[#f5f0e8]/95',
    navText: 'text-slate-400 hover:text-slate-200',
    card: 'border-stone-300 bg-white',
    cardHover: 'hover:border-amber-600/70 hover:bg-stone-50',
    pill: 'border-amber-500/50 bg-amber-500/15 text-slate-200',
    accent: 'text-amber-600',
    accentBg: 'bg-amber-600',
    accentBgText: 'text-white',
    accentBorder: 'border-amber-600/50',
    accentTint: 'bg-amber-600/10',
    muted: 'text-slate-300',
    faint: 'text-slate-400',
    divider: 'border-stone-300',
    sectionAlt: 'bg-[#ede7db]',
    btnPrimary: 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-600/25',
    btnGhost: 'border border-stone-400 text-slate-200 hover:bg-stone-200',
    footerBg: 'bg-[#e8e0d4]',
    monoMuted: 'text-stone-500',
    gridColor: 'rgba(0,0,0,0.05)',
    glowLeft: 'rgba(180,83,9,0.08)',
    toggleBg: 'bg-stone-200 text-amber-700 hover:bg-stone-300',
    planPopular: 'border-amber-600/70 bg-amber-50',
    planNormal: 'border-stone-300 bg-white',
    planPopLine: 'bg-amber-600',
    testimonial: 'border-stone-300 bg-white',
    quoteColor: 'text-amber-600/50',
    timelineLine: 'bg-stone-300',
    timelineDot: 'bg-amber-600 border-amber-600',
    timelineDotInner: 'bg-[#f5f0e8]',
    painBg: 'bg-[#ede7db]',
    painBorder: 'border-rose-600/30',
    painText: 'text-rose-700',
  },
}

// ─── datos ────────────────────────────────────────────────────────────────────

const PAIN_POINTS = [
  { icon: 'bx bx-file-blank', text: 'Partes en papel que se pierden o se mojan' },
  { icon: 'bx bx-spreadsheet', text: 'Excel con fórmulas que nadie entiende' },
  { icon: 'bx bx-time', text: 'Calcular horas a mano cada fin de mes' },
  { icon: 'bx bx-confused', text: 'No saber qué OT lleva quién en este momento' },
]

const TRUST_METRICS = [
  { v: '100%', l: 'cumplimiento RDL 8/2019', icon: 'bx bx-shield-check' },
  { v: '< 5 min', l: 'para empezar a usar', icon: 'bx bx-rocket' },
  { v: '0 €', l: 'tarjeta requerida', icon: 'bx bx-credit-card' },
  { v: '15 días', l: 'prueba completamente gratis', icon: 'bx bx-gift' },
]

const FEATURES = [
  {
    n: '01',
    icon: 'bx bx-list-check',
    title: 'Órdenes de Trabajo',
    desc: 'Crea OTs con código automático ORD-YYYY-NNN, asigna operarios y sigue el estado en tiempo real desde cualquier pantalla.',
  },
  {
    n: '02',
    icon: 'bx bx-time-five',
    title: 'Control de Fichaje',
    desc: 'Registro de jornada desde web, móvil o tablet. Cumplimiento del Real Decreto-ley 8/2019 sin esfuerzo extra.',
  },
  {
    n: '03',
    icon: 'bx bx-package',
    title: 'Gestión de Stock',
    desc: 'Inventario en tiempo real con alertas de mínimo. Cada OT descuenta automáticamente del stock del taller.',
  },
  {
    n: '04',
    icon: 'bx bx-group',
    title: 'RRHH Integrado',
    desc: 'Vacaciones, ausencias y calendario laboral conectados directamente con el fichaje de cada operario.',
  },
  {
    n: '05',
    icon: 'bx bx-wrench',
    title: 'GMAO — Equipos',
    desc: 'Registra tu maquinaria, asigna estados operativos y recibe alertas de mantenimiento preventivo.',
  },
  {
    n: '06',
    icon: 'bx bx-bot',
    title: 'IA Especializada',
    desc: 'Asistente con contexto real de tus OTs y stock. Solo sabe de tu taller — respuestas precisas, sin hallucinar.',
  },
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
    desc: 'Stock, RRHH, equipos y OTs — todo en una pantalla.',
  },
]

const TESTIMONIALS = [
  {
    quote:
      'Antes tardaba media hora al final del día en apuntar las horas y las OTs. Ahora lo hago en tiempo real desde el móvil y el jefe lo ve al instante. Es una pasada.',
    name: 'Miguel Ángel R.',
    role: 'Soldador oficial — Taller Metálicas Norte',
    initials: 'MR',
  },
  {
    quote:
      'La inspección de trabajo nos pidió el registro de jornada y en 30 segundos lo tuvimos exportado. Con el Excel anterior hubiera tardado dos días. Ya no hay vuelta atrás.',
    name: 'Carlos F.',
    role: 'Dueño — Calderería y Montajes CF',
    initials: 'CF',
  },
]

const PLANS = [
  {
    name: 'STARTER',
    users: 'hasta 5 operarios',
    price: '29',
    features: ['OTs ilimitadas', 'Control de fichaje', 'Gestión de stock', 'Soporte por email'],
    popular: false,
  },
  {
    name: 'PRO',
    users: 'operarios ilimitados',
    price: '59',
    features: [
      'Todo de Starter',
      'RRHH completo',
      'GMAO — Equipos',
      'IA integrada',
      'Escaneo QR',
      'Soporte prioritario',
    ],
    popular: true,
  },
]

// ─── theme toggle ─────────────────────────────────────────────────────────────

const ThemeToggle = ({ isDark, onToggle, t }) => (
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

// ─── navbar ───────────────────────────────────────────────────────────────────

const NavBar = ({ isDark, onToggle, t }) => (
  <nav
    className={cx(
      'fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b px-6 py-3 backdrop-blur-md transition-colors duration-300',
      t.nav
    )}
  >
    <div className="flex items-center gap-3">
      <img src="/weldix-icon.svg" alt="Weldix" className="h-7 w-7 shrink-0 object-contain" />
      <div>
        <p className="text-sm font-black tracking-[0.22em]">WELDIX</p>
        <p className={cx('text-[0.48rem] font-bold uppercase tracking-[0.22em]', t.monoMuted)}>
          gestión industrial
        </p>
      </div>
    </div>

    <div className="hidden items-center gap-8 md:flex">
      {['Módulos', 'Cómo funciona', 'Precios'].map((l) => (
        <button
          key={l}
          type="button"
          className={cx(
            'text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition',
            t.navText
          )}
        >
          {l}
        </button>
      ))}
    </div>

    <div className="flex items-center gap-2">
      <ThemeToggle isDark={isDark} onToggle={onToggle} t={t} />
      <Link
        to="/login"
        className={cx(
          'hidden px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wider transition sm:block',
          t.navText
        )}
      >
        Acceder
      </Link>
      <Link
        to="/registro"
        className={cx(
          'flex items-center gap-1.5 rounded-sm px-4 py-2 text-[0.7rem] font-black uppercase tracking-wider shadow-lg transition',
          t.btnPrimary
        )}
      >
        <i className="bx bx-rocket text-sm" />
        Crear taller
      </Link>
    </div>
  </nav>
)

// ─── hero — pain first ────────────────────────────────────────────────────────

const HeroSection = ({ t, isDark }) => (
  <section
    data-gsap="hero-section"
    className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 pb-24 pt-28 lg:flex-row lg:items-center lg:gap-20"
  >
    <div
      data-gsap="hero-grid"
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `linear-gradient(${t.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${t.gridColor} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }}
    />
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background: `radial-gradient(ellipse 80% 70% at -10% 55%, ${t.glowLeft} 0%, transparent 60%)`,
      }}
    />

    <div className="relative z-10 flex-1 space-y-7 lg:max-w-2xl">
      {/* Pain pill */}
      <div
        data-gsap="hero-badge"
        className={cx('inline-flex items-center gap-2 rounded-sm border px-3 py-1.5', t.pill)}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
        <span className="text-[0.58rem] font-bold uppercase tracking-[0.18em]">
          Para talleres de soldadura · calderería · metal
        </span>
      </div>

      {/* Pain-first headline */}
      <div className="space-y-3">
        <h1 className="text-[3.8rem] font-black uppercase leading-[0.9] tracking-tighter sm:text-[5rem] lg:text-[5.8rem]">
          <span data-gsap="hero-line" className={cx('block', t.headline)}>
            ¿Sigues
          </span>
          <span data-gsap="hero-line" className={cx('block', t.headline)}>
            gestionando
          </span>
          <span data-gsap="hero-line" className={cx('block', t.headlineAccent)}>
            con papel
          </span>
          <span data-gsap="hero-line" className={cx('block', t.headline)}>
            y Excel?
          </span>
        </h1>
        <div data-gsap="hero-bar" className={cx('h-[3px] w-20', t.accentBg)} />
      </div>

      <p data-gsap="hero-sub" className={cx('max-w-lg text-base leading-relaxed', t.muted)}>
        Cada hora que pierdes con papel y llamadas es dinero que no cobras. Weldix digitaliza tu
        taller en 5 minutos — sin instalar nada, sin formación.
      </p>

      {/* CTAs múltiples */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/registro"
          data-gsap="hero-cta"
          className={cx(
            'flex items-center gap-2 rounded-sm px-7 py-3.5 text-sm font-black uppercase tracking-wider shadow-lg transition',
            t.btnPrimary
          )}
        >
          <i className="bx bx-rocket text-base" />
          Probar 15 días gratis
        </Link>
        <a
          href="mailto:hola@weldix.app?subject=Quiero%20saber%20más%20sobre%20Weldix"
          data-gsap="hero-cta"
          className={cx(
            'flex items-center gap-2 rounded-sm px-7 py-3.5 text-sm font-semibold uppercase tracking-wider transition',
            t.btnGhost
          )}
        >
          <i className="bx bx-envelope text-base" />
          Email
        </a>
      </div>

      <p className={cx('text-[0.62rem] font-semibold uppercase tracking-[0.18em]', t.faint)}>
        Sin compromiso · Sin tarjeta · Sin instalación
      </p>

      {/* Stats grid */}
      <div
        data-gsap="hero-stats"
        className={cx(
          'grid grid-cols-4 divide-x border',
          t.divider,
          isDark ? 'divide-slate-800' : 'divide-stone-200'
        )}
      >
        {[
          { v: '< 5 min', l: 'setup' },
          { v: '0 €', l: 'tarjeta' },
          { v: '15 días', l: 'gratis' },
          { v: '100%', l: 'cloud' },
        ].map(({ v, l }) => (
          <div key={l} className="p-3 text-center">
            <div className={cx('text-sm font-black', t.accent)}>{v}</div>
            <div
              className={cx(
                'mt-0.5 text-[0.48rem] font-semibold uppercase tracking-[0.14em]',
                t.faint
              )}
            >
              {l}
            </div>
          </div>
        ))}
      </div>
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
  </section>
)

// ─── pain points ──────────────────────────────────────────────────────────────

const PainSection = ({ t }) => (
  <section
    className={cx('border-y px-6 py-16 transition-colors duration-300', t.divider, t.painBg)}
  >
    <div className="mx-auto max-w-6xl">
      <p
        className={cx(
          'mb-8 text-center font-mono text-[0.58rem] font-bold uppercase tracking-[0.25em]',
          t.painText
        )}
      >
        // ¿te suena esto?
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PAIN_POINTS.map(({ icon, text }) => (
          <div
            key={text}
            data-gsap="pain-card"
            className={cx('flex items-start gap-3 rounded-sm border p-4', t.painBorder)}
          >
            <i className={cx(icon, 'mt-0.5 shrink-0 text-lg', t.painText)} />
            <p className={cx('text-sm leading-relaxed', t.muted)}>{text}</p>
          </div>
        ))}
      </div>
      <p className={cx('mt-6 text-center text-sm font-semibold', t.muted)}>
        Si has dicho sí a alguno de estos, Weldix es para ti.
      </p>
    </div>
  </section>
)

// ─── trust metrics ────────────────────────────────────────────────────────────

const TrustMetricsBar = ({ t, isDark }) => (
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

// ─── features ─────────────────────────────────────────────────────────────────

const FeaturesSection = ({ t }) => (
  <section className="px-6 py-24">
    <div className="mx-auto max-w-6xl">
      <div
        className={cx(
          'mb-12 flex flex-col justify-between gap-4 border-b pb-8 sm:flex-row sm:items-end',
          t.divider
        )}
      >
        <div>
          <p
            className={cx(
              'mb-2 font-mono text-[0.58rem] font-bold uppercase tracking-[0.25em]',
              t.accent
            )}
          >
            // 01 · módulos
          </p>
          <h2
            className={cx('text-3xl font-black uppercase tracking-tight sm:text-4xl', t.headline)}
          >
            Todo lo que necesita
            <br />
            tu taller
          </h2>
        </div>
        <p className={cx('hidden text-right text-xs leading-relaxed sm:block', t.muted)}>
          Una plataforma completa.
          <br />
          Sin papel. Sin instalaciones.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ n, icon, title, desc }) => (
          <article
            key={n}
            data-gsap="feature-card"
            className={cx(
              'group relative border-b border-r p-7 transition-colors duration-200 last:border-r-0',
              t.card,
              t.cardHover
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cx(
                  'flex h-10 w-10 shrink-0 items-center justify-center border text-xl',
                  t.accentTint,
                  t.accentBorder,
                  t.accent
                )}
              >
                <i className={icon} />
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span
                    className={cx(
                      'font-mono text-[0.52rem] font-black tracking-widest',
                      t.monoMuted
                    )}
                  >
                    {n}
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-wide">{title}</h3>
                </div>
                <p className={cx('text-xs leading-relaxed', t.muted)}>{desc}</p>
              </div>
            </div>
            <div
              className={cx(
                'absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 opacity-0 transition-opacity group-hover:opacity-100',
                t.accentBorder
              )}
            />
          </article>
        ))}
      </div>
    </div>
  </section>
)

// ─── timeline — inspirado en Deel ────────────────────────────────────────────

const TimelineSection = ({ t }) => (
  <section
    data-gsap="timeline-section"
    className={cx('px-6 py-24 transition-colors duration-300', t.sectionAlt)}
  >
    <div className="mx-auto max-w-6xl">
      <div className={cx('mb-14 border-b pb-8', t.divider)}>
        <p
          className={cx(
            'mb-2 font-mono text-[0.58rem] font-bold uppercase tracking-[0.25em]',
            t.accent
          )}
        >
          // 02 · proceso
        </p>
        <h2 className={cx('text-3xl font-black uppercase tracking-tight sm:text-4xl', t.headline)}>
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
            'inline-flex items-center gap-2 rounded-sm px-8 py-3.5 text-sm font-black uppercase tracking-wider shadow-lg transition',
            t.btnPrimary
          )}
        >
          <i className="bx bx-rocket" />
          Empezar hoy — gratis
        </Link>
      </div>
    </div>
  </section>
)

// ─── testimonios — inspirado en Woffu ────────────────────────────────────────

const TestimonialsSection = ({ t }) => (
  <section className="px-6 py-24">
    <div className="mx-auto max-w-6xl">
      <div className={cx('mb-12 border-b pb-8', t.divider)}>
        <p
          className={cx(
            'mb-2 font-mono text-[0.58rem] font-bold uppercase tracking-[0.25em]',
            t.accent
          )}
        >
          // 03 · testimonios
        </p>
        <h2 className={cx('text-3xl font-black uppercase tracking-tight sm:text-4xl', t.headline)}>
          Lo que dicen
          <br />
          los talleres
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {TESTIMONIALS.map(({ quote, name, role, initials }) => (
          <blockquote
            key={name}
            data-gsap="testimonial"
            className={cx(
              'relative rounded-sm border p-8 transition-colors duration-200',
              t.testimonial
            )}
          >
            {/* Comillas decorativas */}
            <span
              className={cx(
                'absolute right-6 top-4 font-serif text-6xl leading-none',
                t.quoteColor
              )}
            >
              "
            </span>

            <p className={cx('relative z-10 mb-6 text-sm leading-relaxed', t.muted)}>"{quote}"</p>

            <footer className="flex items-center gap-3">
              <div
                className={cx(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border text-xs font-black',
                  t.accentTint,
                  t.accentBorder,
                  t.accent
                )}
              >
                {initials}
              </div>
              <div>
                <p className="text-sm font-bold">{name}</p>
                <p
                  className={cx('text-[0.65rem] font-semibold uppercase tracking-[0.1em]', t.faint)}
                >
                  {role}
                </p>
              </div>
            </footer>
          </blockquote>
        ))}
      </div>

      {/* ROI metric */}
      <div data-gsap="roi-metric" className={cx('mt-8 rounded-sm border p-6 text-center', t.card)}>
        <p className={cx('text-3xl font-black', t.accent)}>+2 horas/día ahorradas</p>
        <p className={cx('mt-1 text-sm', t.muted)}>
          de media por taller en los primeros 30 días de uso
        </p>
      </div>
    </div>
  </section>
)

// ─── precios ──────────────────────────────────────────────────────────────────

const PricingSection = ({ t }) => (
  <section className={cx('px-6 py-24 transition-colors duration-300', t.sectionAlt)}>
    <div className="mx-auto max-w-6xl">
      <div
        className={cx(
          'mb-12 flex flex-col justify-between gap-4 border-b pb-8 sm:flex-row sm:items-end',
          t.divider
        )}
      >
        <div>
          <p
            className={cx(
              'mb-2 font-mono text-[0.58rem] font-bold uppercase tracking-[0.25em]',
              t.accent
            )}
          >
            // 04 · precios
          </p>
          <h2
            className={cx('text-3xl font-black uppercase tracking-tight sm:text-4xl', t.headline)}
          >
            Sin sorpresas.
            <br />
            Sin letra pequeña.
          </h2>
        </div>
        <p className={cx('hidden text-right text-xs', t.muted)}>
          15 días de prueba gratuita.
          <br />
          Sin tarjeta de crédito.
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl md:grid-cols-2">
        {PLANS.map(({ name, users, price, features, popular }, i) => (
          <div
            key={name}
            data-gsap="plan-card"
            className={cx(
              'relative flex flex-col border p-8 transition-colors',
              popular ? t.planPopular : t.planNormal,
              i > 0 && '-ml-px'
            )}
          >
            {popular && <div className={cx('absolute inset-x-0 top-0 h-[2px]', t.planPopLine)} />}
            <div className="mb-6 space-y-1">
              <p className={cx('font-mono text-[0.52rem] uppercase tracking-[0.2em]', t.monoMuted)}>
                {users}
              </p>
              <h3 className="text-lg font-black uppercase tracking-wider">{name}</h3>
              {popular && (
                <span
                  className={cx(
                    'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[0.52rem] font-black uppercase tracking-widest',
                    t.accentBg,
                    t.accentBgText
                  )}
                >
                  <i className="bx bx-star text-[0.7rem]" />
                  Recomendado
                </span>
              )}
            </div>
            <div className="mb-6">
              <span className="text-5xl font-black">{price}€</span>
              <span className={cx('text-sm', t.muted)}> / mes</span>
            </div>
            <ul className="mb-8 flex-1 space-y-2.5">
              {features.map((f) => (
                <li key={f} className={cx('flex items-start gap-2 text-xs', t.muted)}>
                  <i className={cx('bx bx-check mt-px shrink-0 text-sm', t.accent)} />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/registro"
              className={cx(
                'flex items-center justify-center gap-2 rounded-sm py-3 text-xs font-black uppercase tracking-wider transition',
                popular ? t.btnPrimary : t.btnGhost
              )}
            >
              Empezar 15 días gratis
            </Link>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ─── cta final ────────────────────────────────────────────────────────────────

const CtaSection = ({ t }) => (
  <section
    data-gsap="cta-section"
    className={cx('border-y px-6 py-28 text-center transition-colors duration-300', t.divider)}
  >
    <div className="mx-auto max-w-2xl space-y-6">
      <p className={cx('font-mono text-[0.58rem] font-bold uppercase tracking-[0.25em]', t.accent)}>
        // fin de línea
      </p>
      <h2
        data-gsap="cta-headline"
        className={cx(
          'text-5xl font-black uppercase leading-tight tracking-tighter sm:text-6xl',
          t.headline
        )}
      >
        Tu taller,
        <br />
        <span className={t.accent}>en marcha hoy.</span>
      </h2>
      <p data-gsap="cta-sub" className={cx('mx-auto max-w-md text-sm leading-relaxed', t.muted)}>
        Gestiona tus OTs, fichajes y stock desde una sola plataforma. Olvídate del papel y del Excel
        para siempre.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/registro"
          data-gsap="cta-primary"
          className={cx(
            'flex items-center gap-2 rounded-sm px-10 py-4 text-sm font-black uppercase tracking-wider shadow-lg transition',
            t.btnPrimary
          )}
        >
          <i className="bx bx-rocket text-lg" />
          Crear mi taller gratis
        </Link>
      </div>
      <p className={cx('text-[0.62rem] font-semibold uppercase tracking-[0.18em]', t.faint)}>
        Sin compromiso · Sin tarjeta · Cancela cuando quieras
      </p>
    </div>
  </section>
)

// ─── footer ───────────────────────────────────────────────────────────────────

const LandingFooter = ({ t }) => (
  <footer
    className={cx('border-t px-6 py-8 transition-colors duration-300', t.footerBg, t.divider)}
  >
    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
      <div className="flex items-center gap-2">
        <img
          src="/weldix-icon.svg"
          alt="Weldix"
          className="h-5 w-5 shrink-0 opacity-40 object-contain"
        />
        <span
          className={cx(
            'font-mono text-[0.52rem] font-bold uppercase tracking-[0.25em]',
            t.monoMuted
          )}
        >
          WELDIX
        </span>
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
        <a href="mailto:hola@weldix.app" className="transition hover:opacity-100">
          Contacto
        </a>
        <Link to="/login" className="transition hover:opacity-100">
          Acceder
        </Link>
      </div>
      <p className={cx('font-mono text-[0.52rem] uppercase tracking-widest', t.monoMuted)}>
        © 2026 Weldix
      </p>
    </div>
  </footer>
)

// ─── página principal ─────────────────────────────────────────────────────────

const LandingPage = () => {
  const { isDark, toggleTheme } = useTheme()
  const t = isDark ? T.dark : T.light

  // Hook de animaciones GSAP - lee data-gsap del DOM, aplica tweens + ScrollTriggers.
  // No retorna nada: efecto de lado puro (SOC - el componente pinta, el hook anima).
  useLandingAnimations()

  return (
    <div className={cx('min-h-screen transition-colors duration-300', t.page)}>
      <NavBar isDark={isDark} onToggle={toggleTheme} t={t} />
      <HeroSection t={t} isDark={isDark} />
      <PainSection t={t} />
      <TrustMetricsBar t={t} isDark={isDark} />
      <FeaturesSection t={t} />
      <TimelineSection t={t} />
      <TestimonialsSection t={t} />
      <PricingSection t={t} />
      <CtaSection t={t} />
      <LandingFooter t={t} />
    </div>
  )
}

export default LandingPage
