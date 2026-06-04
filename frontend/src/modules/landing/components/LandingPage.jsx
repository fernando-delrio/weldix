import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../../core/lib/ThemeContext'

// Alias en JS puro → ESLint detecta el uso de `motion` fuera de JSX
const MotionDiv = motion.div
import { cx } from '../../core/lib/cx'
import { useLandingAnimations } from '../hooks/useLandingAnimations'
import useTilt from '../hooks/useTilt'
import DemoPreview from './DemoPreview'
import ScrollProgress from './ScrollProgress'
import CountUp from './CountUp'
import MagneticWrap from './MagneticWrap'
import WordReveal from './WordReveal'
import RotatingBadge from './RotatingBadge'
import SocialProofToast from './SocialProofToast'

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
    // Paleta sincronizada con el app (index.css data-theme='light'):
    // fondo #f1f5f9, cards #ffffff, texto #0f172a/#334155, bordes #e2e8f0
    page: 'bg-[#f1f5f9] text-[#334155]',
    headline: 'text-[#0f172a]',
    headlineAccent: 'text-amber-600',
    nav: 'border-[#e2e8f0] bg-white/95',
    navText: 'text-[#475569] hover:text-[#0f172a]',
    card: 'border-[#e2e8f0] bg-white',
    cardHover: 'hover:border-amber-500/50 hover:bg-[#f8fafc]',
    pill: 'border-amber-500/40 bg-amber-50 text-amber-700',
    accent: 'text-amber-600',
    accentBg: 'bg-amber-600',
    accentBgText: 'text-white',
    accentBorder: 'border-amber-500/40',
    accentTint: 'bg-amber-50',
    muted: 'text-[#475569]',
    faint: 'text-[#64748b]',
    divider: 'border-[#e2e8f0]',
    sectionAlt: 'bg-[#f8fafc]',
    btnPrimary: 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-600/20',
    btnGhost: 'border border-[#e2e8f0] text-[#334155] hover:bg-[#f1f5f9]',
    footerBg: 'bg-white',
    monoMuted: 'text-[#94a3b8]',
    gridColor: 'rgba(15,23,42,0.04)',
    glowLeft: 'rgba(217,119,6,0.06)',
    toggleBg: 'bg-[#f1f5f9] text-amber-600 hover:bg-[#e2e8f0]',
    planPopular: 'border-amber-500/60 bg-amber-50',
    planNormal: 'border-[#e2e8f0] bg-white',
    planPopLine: 'bg-amber-600',
    testimonial: 'border-[#e2e8f0] bg-white',
    quoteColor: 'text-amber-600/40',
    timelineLine: 'bg-[#e2e8f0]',
    timelineDot: 'bg-amber-600 border-amber-600',
    timelineDotInner: 'bg-[#f1f5f9]',
    painBg: 'bg-[#f8fafc]',
    painBorder: 'border-rose-200',
    painText: 'text-rose-600',
  },
}

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
    icon: 'bx bx-receipt',
    title: 'Albaranes con IA',
    desc: 'Fotografía el albarán del proveedor. La IA extrae los materiales y los incorpora al stock automáticamente — sin teclear nada.',
    highlight: true,
  },
  {
    n: '05',
    icon: 'bx bx-qr',
    title: 'Escáner QR',
    desc: 'Cada OT tiene su QR. El operario lo escanea desde el móvil e inicia el trabajo al instante, sin buscar nada en pantalla.',
  },
  {
    n: '06',
    icon: 'bxs bxs-file-pdf',
    title: 'Nóminas Digitales',
    desc: 'Sube las nóminas al sistema. Cada operario las descarga desde su perfil, sin WhatsApp, sin emails, sin papel.',
  },
  {
    n: '07',
    icon: 'bx bx-group',
    title: 'RRHH Integrado',
    desc: 'Vacaciones, ausencias, EPIs, certificados y turnos — todo conectado con el fichaje de cada operario.',
  },
  {
    n: '08',
    icon: 'bx bx-wrench',
    title: 'GMAO — Equipos',
    desc: 'Registra tu maquinaria, asigna estados operativos y recibe alertas de mantenimiento preventivo antes de que falle.',
  },
  {
    n: '09',
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

// Precios actualizados — base + por operario
const PRECIO_BASE = 49
const PRECIO_POR_OPERARIO = 17

const PLAN_INCLUDES = [
  'OTs ilimitadas',
  'Control de fichaje (RDL 8/2019)',
  'Stock + albaranes con IA',
  'Escáner QR',
  'RRHH completo + nóminas',
  'GMAO — equipos y mantenimiento',
  'IA especializada en tu taller',
  'Soporte incluido',
]

const PLAN_EXAMPLES = [
  { ops: 2, total: PRECIO_BASE + 2 * PRECIO_POR_OPERARIO },
  { ops: 5, total: PRECIO_BASE + 5 * PRECIO_POR_OPERARIO },
  { ops: 10, total: PRECIO_BASE + 10 * PRECIO_POR_OPERARIO },
]

// ─── theme toggle ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Módulos', targetId: 'modulos' },
  { label: 'Cómo funciona', targetId: 'como-funciona' },
  { label: 'Precios', targetId: 'precios' },
]

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

const scrollToLandingSection = (event, targetId) => {
  const section = document.getElementById(targetId)

  if (!section) return

  event.preventDefault()
  section.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const NavBar = ({ isDark, onToggle, t }) => (
  <nav
    style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}
    className={cx(
      'flex items-center justify-between border-b px-6 py-3 transition-colors duration-300',
      isDark ? 'border-slate-800 bg-[#070b0f]' : 'border-[#e2e8f0] bg-white'
    )}
  >
    <div className="flex items-center gap-3">
      <img src="/weldix-icon.svg" alt="Weldix" className="h-7 w-7 shrink-0 object-contain" />
      <div>
        <p className="font-display text-base font-bold tracking-tight">Weldix</p>
        <p className={cx('text-[0.55rem] font-medium uppercase tracking-[0.18em]', t.monoMuted)}>
          gestión industrial
        </p>
      </div>
    </div>

    <div className="hidden items-center gap-8 md:flex">
      {NAV_ITEMS.map(({ label, targetId }) => (
        <a
          key={targetId}
          href={`#${targetId}`}
          onClick={(event) => scrollToLandingSection(event, targetId)}
          className={cx(
            'text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition',
            t.navText
          )}
        >
          {label}
        </a>
      ))}
    </div>

    <div className="flex items-center gap-2">
      <ThemeToggle isDark={isDark} onToggle={onToggle} t={t} />
      <a
        href="mailto:hola@weldix.app?subject=Contacto%20Weldix"
        className={cx(
          'hidden items-center gap-1.5 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wider transition sm:flex',
          t.navText
        )}
      >
        <i className="bx bx-envelope text-sm" />
        Contacto
      </a>
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
          'flex items-center gap-1.5 rounded-lg px-4 py-2 text-[0.7rem] font-bold tracking-wide shadow-lg transition',
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
          <WordReveal text="en tu taller?" className={cx('block', t.headline)} initialDelay={0.6} />
        </h1>
        <div data-gsap="hero-bar" className={cx('h-[2px] w-16 rounded-full', t.accentBg)} />
      </div>

      <p data-gsap="hero-sub" className={cx('max-w-lg text-[1.05rem] leading-relaxed', t.muted)}>
        Cada hora perdida con papeleo es dinero que no cobras. Weldix digitaliza tu taller en 5
        minutos — sin instalar nada.
      </p>

      {/* CTAs envueltos en MagneticWrap */}
      <div className="flex flex-wrap gap-3">
        <MagneticWrap strength={0.3}>
          <Link
            to="/registro"
            data-gsap="hero-cta"
            className={cx(
              'flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold tracking-wide shadow-lg transition',
              t.btnPrimary
            )}
          >
            <i className="bx bx-rocket text-base" />
            Probar 15 días gratis
          </Link>
        </MagneticWrap>
        <MagneticWrap strength={0.25}>
          <a
            href="mailto:hola@weldix.app?subject=Quiero%20saber%20más%20sobre%20Weldix"
            data-gsap="hero-cta"
            className={cx(
              'flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-medium tracking-wide transition',
              t.btnGhost
            )}
          >
            <i className="bx bx-envelope text-base" />
            Email
          </a>
        </MagneticWrap>
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
            className={cx('flex items-start gap-3 rounded-xl border p-4', t.painBorder)}
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

// ─── feature card con tilt 3D ─────────────────────────────────────────────────

const FeatureCard = ({ n, icon, title, desc, highlight, t }) => {
  const { ref, onMouseMove, onMouseLeave } = useTilt(6)

  return (
    <article
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      data-gsap="feature-card"
      style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
      className={cx(
        'group relative border-b border-r p-7 transition-colors duration-200 last:border-r-0',
        highlight ? t.planPopular : t.card,
        t.cardHover
      )}
    >
      {highlight && (
        <span
          className={cx(
            'absolute right-3 top-3 rounded-sm px-2 py-0.5 text-[0.48rem] font-black uppercase tracking-widest',
            t.accentBg,
            t.accentBgText
          )}
        >
          Nuevo
        </span>
      )}
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
              className={cx('font-mono text-[0.52rem] font-black tracking-widest', t.monoMuted)}
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
  )
}

// ─── features ─────────────────────────────────────────────────────────────────

const FeaturesSection = ({ t }) => (
  <section id="modulos" className="scroll-mt-24 px-6 py-24">
    <div className="mx-auto max-w-6xl">
      <div
        className={cx(
          'mb-12 flex flex-col justify-between gap-4 border-b pb-8 sm:flex-row sm:items-end',
          t.divider
        )}
      >
        <div>
          <p className={cx('mb-3 text-[11px] font-medium uppercase tracking-[0.12em]', t.accent)}>
            Módulos
          </p>
          <h2
            className={cx(
              'font-display text-3xl font-extrabold tracking-tight sm:text-4xl',
              t.headline
            )}
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
        {FEATURES.map(({ n, icon, title, desc, highlight }) => (
          <FeatureCard
            key={n}
            n={n}
            icon={icon}
            title={title}
            desc={desc}
            highlight={highlight}
            t={t}
          />
        ))}
      </div>
    </div>
  </section>
)

// ─── timeline — inspirado en Deel ────────────────────────────────────────────

const TimelineSection = ({ t }) => (
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
            'inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold tracking-wide shadow-lg transition',
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
        <p className={cx('mb-3 text-[11px] font-medium uppercase tracking-[0.12em]', t.accent)}>
          Testimonios
        </p>
        <h2
          className={cx(
            'font-display text-3xl font-extrabold tracking-tight sm:text-4xl',
            t.headline
          )}
        >
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
              'relative rounded-2xl border p-8 transition-colors duration-200',
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
      <div data-gsap="roi-metric" className={cx('mt-8 rounded-2xl border p-6 text-center', t.card)}>
        <p className={cx('text-3xl font-black', t.accent)}>1.125€/mes ahorrados</p>
        <p className={cx('mt-1 text-sm', t.muted)}>
          de media por taller con 5 operarios en los primeros 30 días de uso
        </p>
      </div>
    </div>
  </section>
)

// ─── ROI — cuánto ahorra el taller ───────────────────────────────────────────

const ROI_ITEMS = [
  {
    icon: 'bx bx-time-five',
    title: 'Fichaje digital',
    savingNum: 560,
    savingSuffix: '€/mes',
    desc: '5 operarios × 15 min/día de papeleo eliminado = 27 h/mes × 20€/h',
  },
  {
    icon: 'bx bx-receipt',
    title: 'Albaranes con IA',
    savingNum: 270,
    savingSuffix: '€/mes',
    desc: '8 h/mes de transcripción eliminadas + errores de stock evitados',
  },
  {
    icon: 'bx bx-list-check',
    title: 'OTs digitales',
    savingNum: 295,
    savingSuffix: '€/mes',
    desc: '13 h/mes de gestión en papel eliminadas + llamadas al taller reducidas',
  },
]

const RoiSection = ({ t }) => (
  <section
    className={cx('border-y px-6 py-20 transition-colors duration-300', t.divider, t.sectionAlt)}
  >
    <div className="mx-auto max-w-6xl">
      <div className={cx('mb-12 border-b pb-8', t.divider)}>
        <p className={cx('mb-3 text-[11px] font-medium uppercase tracking-[0.12em]', t.accent)}>
          ROI real
        </p>
        <h2
          className={cx(
            'font-display text-3xl font-extrabold tracking-tight sm:text-4xl',
            t.headline
          )}
        >
          Un taller de 5 operarios ahorra <span className={t.accent}>más de 1.100€ al mes</span>{' '}
          <span className="font-light opacity-30">con Weldix.</span>
        </h2>
        <p className={cx('mt-3 max-w-lg text-sm leading-relaxed', t.muted)}>
          Weldix no es un gasto — es una inversión que se paga sola el primer día del mes. Aquí el
          desglose real.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {ROI_ITEMS.map(({ icon, title, savingNum, savingSuffix, desc }) => (
          <div key={title} className={cx('rounded-2xl border p-6 transition-colors', t.card)}>
            <i className={cx(icon, 'mb-3 text-2xl', t.accent)} />
            <p className={cx('text-2xl font-black', t.accent)}>
              <CountUp end={savingNum} suffix={savingSuffix} duration={1.8} />
            </p>
            <p className="mt-1 text-sm font-black uppercase tracking-wide">{title}</p>
            <p className={cx('mt-2 text-xs leading-relaxed', t.muted)}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Comparativa precio vs ahorro */}
      <div className={cx('mt-8 grid gap-3 border p-6 sm:grid-cols-3', t.card)}>
        <div className="text-center">
          <p className={cx('text-[0.6rem] font-bold uppercase tracking-widest', t.muted)}>
            Coste Weldix
          </p>
          <p className={cx('text-3xl font-black', t.accent)}>
            <CountUp end={134} suffix="€" duration={1.5} />
            <span className={cx('text-sm font-normal', t.muted)}>/mes</span>
          </p>
          <p className={cx('text-xs', t.muted)}>49€ base + 5 ops × 17€</p>
        </div>
        <div className="flex items-center justify-center">
          <div
            className={cx(
              'rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest',
              t.accentBorder,
              t.accent
            )}
          >
            vs
          </div>
        </div>
        <div className="text-center">
          <p className={cx('text-[0.6rem] font-bold uppercase tracking-widest', t.muted)}>
            Ahorro real
          </p>
          <p className="text-3xl font-black text-emerald-400">
            <CountUp end={1125} suffix="€" duration={2} format={(n) => n.toLocaleString('es-ES')} />
            <span className={cx('text-sm font-normal', t.muted)}>/mes</span>
          </p>
          <p className={cx('text-xs', t.muted)}>
            ROI:{' '}
            <strong className="text-emerald-400">
              <CountUp end={8} suffix="x" duration={1.2} />
            </strong>{' '}
            — se paga en el primer día
          </p>
        </div>
      </div>
    </div>
  </section>
)

// ─── precios ──────────────────────────────────────────────────────────────────

const PricingSection = ({ t }) => (
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
        {/* Tarjeta de precio único — glow-pulse-amber se aplica via CSS keyframe (sin JS) */}
        <div
          data-gsap="plan-card"
          className={cx('glow-pulse-amber relative border p-8', t.planPopular)}
        >
          <div className={cx('absolute inset-x-0 top-0 h-[2px]', t.planPopLine)} />

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
                'flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold tracking-wide transition shadow-lg',
                t.btnPrimary
              )}
            >
              <i className="bx bx-rocket" />
              Probar 15 días gratis — sin tarjeta
            </Link>
            <a
              href="mailto:hola@weldix.app?subject=Consulta%20sobre%20Weldix"
              className={cx(
                'flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium tracking-wide transition',
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

const CtaSection = ({ t }) => (
  <section
    data-gsap="cta-section"
    className={cx('border-y px-6 py-28 text-center transition-colors duration-300', t.divider)}
  >
    <div className="mx-auto max-w-2xl space-y-6">
      <p className={cx('font-mono text-[0.58rem] font-bold uppercase tracking-[0.25em]', t.accent)}>
        Empieza hoy
      </p>
      <h2
        data-gsap="cta-headline"
        className={cx(
          'font-display text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl',
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
            'flex items-center gap-2 rounded-xl px-10 py-4 text-sm font-bold tracking-wide shadow-lg transition',
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
        <span className={cx('font-display text-sm font-bold tracking-tight', t.monoMuted)}>
          Weldix
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
    <>
      {/* ScrollProgress y SocialProofToast fuera del wrapper — sin transforms de GSAP */}
      <ScrollProgress />
      <NavBar isDark={isDark} onToggle={toggleTheme} t={t} />
      <SocialProofToast isDark={isDark} />
      <div className={cx('min-h-screen transition-colors duration-300', t.page)}>
        <HeroSection t={t} isDark={isDark} />
        <PainSection t={t} />
        <TrustMetricsBar t={t} isDark={isDark} />
        <FeaturesSection t={t} />
        <RoiSection t={t} />
        <TimelineSection t={t} />
        <TestimonialsSection t={t} />
        <PricingSection t={t} />
        <CtaSection t={t} />
        <LandingFooter t={t} />
      </div>
    </>
  )
}

export default LandingPage
