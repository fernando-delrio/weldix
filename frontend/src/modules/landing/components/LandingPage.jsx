import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../../core/lib/cx'

// ─── sistema de tema ──────────────────────────────────────────────────────────

const T = {
  dark: {
    page:         'bg-[#070b0f] text-slate-100',
    nav:          'border-slate-800/80 bg-[#070b0f]/95',
    navText:      'text-slate-400 hover:text-slate-100',
    card:         'border-slate-800 bg-[#0d1520]',
    cardHover:    'hover:border-amber-500/50 hover:bg-[#0f1926]',
    pill:         'border-amber-500/30 bg-amber-500/10 text-amber-400',
    accent:       'text-amber-400',
    accentBg:     'bg-amber-500',
    accentBgText: 'text-black',
    accentBorder: 'border-amber-500/40',
    accentTint:   'bg-amber-500/10',
    muted:        'text-slate-400',
    faint:        'text-slate-600',
    divider:      'border-slate-800',
    sectionAlt:   'bg-[#090e15]',
    btnPrimary:   'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20',
    btnGhost:     'border border-slate-700 text-slate-300 hover:bg-slate-800',
    footerBg:     'bg-[#040608]',
    monoMuted:    'text-slate-600',
    gridColor:    'rgba(255,255,255,0.022)',
    glowLeft:     'rgba(245,158,11,0.10)',
    toggleBg:     'bg-slate-800 text-amber-400 hover:bg-slate-700',
    planPopular:  'border-amber-500/60 bg-[#0f1926]',
    planNormal:   'border-slate-800 bg-[#0d1520]',
    planPopLine:  'bg-amber-500',
  },
  light: {
    page:         'bg-[#f2ebe0] text-slate-900',
    nav:          'border-stone-300 bg-[#f2ebe0]/95',
    navText:      'text-slate-500 hover:text-slate-900',
    card:         'border-stone-200 bg-white',
    cardHover:    'hover:border-amber-600/70 hover:bg-stone-50',
    pill:         'border-amber-600/40 bg-amber-500/10 text-amber-700',
    accent:       'text-amber-700',
    accentBg:     'bg-amber-600',
    accentBgText: 'text-white',
    accentBorder: 'border-amber-600/40',
    accentTint:   'bg-amber-600/10',
    muted:        'text-slate-600',
    faint:        'text-slate-400',
    divider:      'border-stone-200',
    sectionAlt:   'bg-[#ebe3d8]',
    btnPrimary:   'bg-amber-600 text-white hover:bg-amber-500 shadow-amber-600/20',
    btnGhost:     'border border-stone-300 text-slate-700 hover:bg-stone-100',
    footerBg:     'bg-[#e6ddd1]',
    monoMuted:    'text-stone-400',
    gridColor:    'rgba(0,0,0,0.035)',
    glowLeft:     'rgba(180,83,9,0.07)',
    toggleBg:     'bg-stone-200 text-amber-700 hover:bg-stone-300',
    planPopular:  'border-amber-600/60 bg-amber-50',
    planNormal:   'border-stone-200 bg-white',
    planPopLine:  'bg-amber-600',
  },
}

// ─── datos ────────────────────────────────────────────────────────────────────

const FEATURES = [
  { n: '01', icon: 'bx bx-list-check', title: 'Órdenes de Trabajo',  desc: 'Crea OTs con código automático ORD-YYYY-NNN, asigna operarios y sigue el estado en tiempo real desde cualquier pantalla.' },
  { n: '02', icon: 'bx bx-time-five',  title: 'Control de Fichaje',  desc: 'Registro de jornada desde web, móvil o tablet. Cumplimiento del Real Decreto-ley 8/2019 sin esfuerzo extra.' },
  { n: '03', icon: 'bx bx-package',    title: 'Gestión de Stock',    desc: 'Inventario en tiempo real con alertas de mínimo. Cada OT descuenta automáticamente del stock del taller.' },
  { n: '04', icon: 'bx bx-group',      title: 'RRHH Integrado',      desc: 'Vacaciones, ausencias y calendario laboral conectados directamente con el fichaje de cada operario.' },
  { n: '05', icon: 'bx bx-wrench',     title: 'GMAO — Equipos',      desc: 'Registra tu maquinaria, asigna estados operativos y recibe alertas de mantenimiento preventivo.' },
  { n: '06', icon: 'bx bx-bot',        title: 'IA Especializada',    desc: 'Asistente con contexto real de tus OTs y stock. Solo sabe de tu taller — respuestas precisas, sin hallucinar.' },
]

const PLANS = [
  {
    name: 'STARTER',
    users: 'hasta 5 operarios',
    price: '19',
    features: ['OTs ilimitadas', 'Control de fichaje', 'Gestión de stock', 'Soporte por email'],
    popular: false,
  },
  {
    name: 'TALLER',
    users: 'hasta 20 operarios',
    price: '49',
    features: ['Todo de Starter', 'RRHH completo', 'GMAO — Equipos', 'IA integrada', 'Escaneo QR', 'Soporte prioritario'],
    popular: true,
  },
  {
    name: 'INDUSTRIA',
    users: 'operarios ilimitados',
    price: '89',
    features: ['Todo de Taller', 'Automatizaciones n8n', 'Portal cliente', 'Facturas en PDF', 'SLA garantizado'],
    popular: false,
  },
]

const STATS = [
  { v: '< 5 min', l: 'para empezar' },
  { v: '0 €',     l: 'tarjeta requerida' },
  { v: '15 días', l: 'prueba gratis' },
  { v: '100%',    l: 'en la nube' },
]

const MOCK_OTS = [
  { code: 'ORD-2026-047', op: 'García, J.',  status: 'EN PROCESO', dot: 'bg-sky-400' },
  { code: 'ORD-2026-048', op: 'Martín, R.',  status: 'CONTROL Q.', dot: 'bg-amber-400' },
  { code: 'ORD-2026-049', op: 'Pérez, L.',   status: 'LISTO',      dot: 'bg-emerald-400' },
  { code: 'ORD-2026-050', op: '—',           status: 'PENDIENTE',  dot: 'bg-slate-500' },
]

// ─── theme toggle ─────────────────────────────────────────────────────────────

const ThemeToggle = ({ isDark, onToggle, t }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    className={cx('flex h-8 w-8 items-center justify-center rounded-sm transition', t.toggleBg)}
  >
    {isDark ? (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
      </svg>
    )}
  </button>
)

// ─── navbar ───────────────────────────────────────────────────────────────────

const NavBar = ({ isDark, onToggle, t }) => (
  <nav className={cx('fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b px-6 py-3 backdrop-blur-md transition-colors duration-300', t.nav)}>
    <div className="flex items-center gap-3">
      <img src="/weldix-icon.svg" alt="Weldix" className="h-7 w-7 shrink-0 object-contain" />
      <div>
        <p className="text-sm font-black tracking-[0.22em]">WELDIX</p>
        <p className={cx('text-[0.48rem] font-bold uppercase tracking-[0.22em]', t.monoMuted)}>gestión industrial</p>
      </div>
    </div>

    <div className="hidden items-center gap-8 md:flex">
      {['Módulos', 'Precios', 'Contacto'].map((l) => (
        <button key={l} type="button" className={cx('text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition', t.navText)}>
          {l}
        </button>
      ))}
    </div>

    <div className="flex items-center gap-2">
      <ThemeToggle isDark={isDark} onToggle={onToggle} t={t} />
      <Link
        to="/login"
        className={cx('hidden px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wider transition sm:block', t.navText)}
      >
        Acceder
      </Link>
      <Link
        to="/registro"
        className={cx('flex items-center gap-1.5 rounded-sm px-4 py-2 text-[0.7rem] font-black uppercase tracking-wider shadow-lg transition', t.btnPrimary)}
      >
        <i className="bx bx-rocket text-sm" />
        Crear taller
      </Link>
    </div>
  </nav>
)

// ─── dashboard mockup ─────────────────────────────────────────────────────────

const DashboardMockup = ({ t }) => (
  <div className={cx('relative rounded-sm border p-5 font-mono text-xs shadow-2xl transition-colors duration-300', t.card)}>
    {/* Corner brackets */}
    <div className={cx('absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2', t.accentBorder)} />
    <div className={cx('absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2', t.accentBorder)} />

    {/* Status bar */}
    <div className={cx('mb-3 flex items-center gap-2 border-b pb-3', t.divider)}>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      <span className={cx('text-[0.55rem] uppercase tracking-widest', t.monoMuted)}>
        taller metalúrgico · sistema activo
      </span>
    </div>

    {/* OT list */}
    <div>
      {MOCK_OTS.map(({ code, op, status, dot }) => (
        <div key={code} className={cx('flex items-center justify-between border-b py-2 last:border-b-0', t.divider)}>
          <span className={cx('text-[0.65rem] font-bold', t.muted)}>{code}</span>
          <span className={cx('text-[0.55rem] tracking-wide', t.monoMuted)}>{op}</span>
          <div className="flex items-center gap-1.5">
            <span className={cx('h-1.5 w-1.5 rounded-full', dot)} />
            <span className={cx('text-[0.55rem] font-black tracking-widest', t.muted)}>{status}</span>
          </div>
        </div>
      ))}
    </div>

    {/* Mini metrics */}
    <div className={cx('mt-3 grid grid-cols-3 gap-1.5 border-t pt-3', t.divider)}>
      {[{ v: '14', l: 'ACTIVAS' }, { v: '03', l: 'HOY' }, { v: '97%', l: 'A TIEMPO' }].map(({ v, l }) => (
        <div key={l} className={cx('rounded-sm border p-2 text-center', t.card)}>
          <div className={cx('text-sm font-black', t.accent)}>{v}</div>
          <div className={cx('text-[0.48rem] tracking-widest', t.monoMuted)}>{l}</div>
        </div>
      ))}
    </div>

    {/* Fichaje strip */}
    <div className={cx('mt-3 flex items-center justify-between border-t pt-3', t.divider)}>
      <span className={cx('text-[0.55rem] uppercase tracking-widest', t.monoMuted)}>jornada activa</span>
      <span className={cx('rounded-sm px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-wider', t.accentTint, t.accent)}>
        07:32:14 ▶
      </span>
    </div>
  </div>
)

// ─── hero ─────────────────────────────────────────────────────────────────────

const HeroSection = ({ t, isDark }) => (
  <section className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 pb-24 pt-28 lg:flex-row lg:items-center lg:gap-20">

    {/* Crosshatch grid */}
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `linear-gradient(${t.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${t.gridColor} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }}
    />

    {/* Amber glow from left */}
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background: `radial-gradient(ellipse 80% 70% at -10% 55%, ${t.glowLeft} 0%, transparent 60%)`,
      }}
    />

    {/* Left — headline */}
    <div className="relative z-10 flex-1 space-y-7 lg:max-w-2xl">

      <div className={cx('inline-flex items-center gap-2 rounded-sm border px-3 py-1.5', t.pill)}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
        <span className="text-[0.58rem] font-bold uppercase tracking-[0.18em]">
          Diseñado para soldadura · calderería · metal
        </span>
      </div>

      <div className="space-y-3">
        <h1 className="text-[4.5rem] font-black uppercase leading-[0.9] tracking-tighter sm:text-[5.5rem] lg:text-[6.5rem]">
          Control
          <br />
          total
          <br />
          <span className={t.accent}>de tu</span>
          <br />
          taller.
        </h1>
        <div className={cx('h-[3px] w-20', t.accentBg)} />
      </div>

      <p className={cx('max-w-lg text-base leading-relaxed', t.muted)}>
        OTs, fichaje, stock, RRHH y equipos en una sola plataforma.
        PWA — instálala en la tablet del taller sin pasar por el App Store.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/registro"
          className={cx('flex items-center gap-2 rounded-sm px-7 py-3.5 text-sm font-black uppercase tracking-wider shadow-lg transition', t.btnPrimary)}
        >
          <i className="bx bx-rocket text-base" />
          Crear mi taller gratis
        </Link>
        <Link
          to="/login"
          className={cx('flex items-center gap-2 rounded-sm px-7 py-3.5 text-sm font-semibold uppercase tracking-wider transition', t.btnGhost)}
        >
          Ya tengo cuenta →
        </Link>
      </div>

      <p className={cx('text-[0.62rem] font-semibold uppercase tracking-[0.18em]', t.faint)}>
        15 días gratis · Sin tarjeta de crédito · Setup en 5 minutos
      </p>

      {/* Stats grid */}
      <div className={cx('grid grid-cols-4 divide-x border', t.divider, isDark ? 'divide-slate-800' : 'divide-stone-200')}>
        {STATS.map(({ v, l }) => (
          <div key={l} className="p-3 text-center">
            <div className={cx('text-sm font-black', t.accent)}>{v}</div>
            <div className={cx('mt-0.5 text-[0.48rem] font-semibold uppercase tracking-[0.14em]', t.faint)}>{l}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Right — mockup */}
    <div className="relative z-10 mt-14 w-full max-w-sm lg:mt-0 lg:max-w-md">
      <DashboardMockup t={t} />
      <div className={cx('mt-2 flex items-center gap-2 font-mono text-[0.52rem] uppercase tracking-widest', t.monoMuted)}>
        <span className={cx('h-px flex-1', t.divider)} />
        preview · taller demo
        <span className={cx('h-px flex-1', t.divider)} />
      </div>
    </div>
  </section>
)

// ─── features ─────────────────────────────────────────────────────────────────

const FeaturesSection = ({ t }) => (
  <section className={cx('px-6 py-24 transition-colors duration-300', t.sectionAlt)}>
    <div className="mx-auto max-w-6xl">

      <div className={cx('mb-12 flex flex-col justify-between gap-4 border-b pb-8 sm:flex-row sm:items-end', t.divider)}>
        <div>
          <p className={cx('mb-2 font-mono text-[0.58rem] font-bold uppercase tracking-[0.25em]', t.accent)}>
            // 01 · módulos
          </p>
          <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Todo lo que necesita<br />tu taller
          </h2>
        </div>
        <p className={cx('hidden text-right text-xs leading-relaxed sm:block', t.muted)}>
          Una plataforma completa.<br />Sin papel. Sin instalaciones.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ n, icon, title, desc }) => (
          <article
            key={n}
            className={cx(
              'group relative border-b border-r p-7 transition-colors duration-200',
              t.card, t.cardHover,
              // Remove right border on last column in each row
              'last:border-r-0',
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cx('flex h-10 w-10 shrink-0 items-center justify-center border text-xl transition', t.accentTint, t.accentBorder, t.accent)}>
                <i className={icon} />
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className={cx('font-mono text-[0.52rem] font-black tracking-widest', t.monoMuted)}>{n}</span>
                  <h3 className="text-sm font-black uppercase tracking-wide">{title}</h3>
                </div>
                <p className={cx('text-xs leading-relaxed', t.muted)}>{desc}</p>
              </div>
            </div>
            {/* Amber corner on hover */}
            <div className={cx('absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 opacity-0 transition-opacity group-hover:opacity-100', t.accentBorder)} />
          </article>
        ))}
      </div>
    </div>
  </section>
)

// ─── cómo funciona ────────────────────────────────────────────────────────────

const HowItWorksSection = ({ t, isDark }) => (
  <section className="px-6 py-24">
    <div className="mx-auto max-w-6xl">

      <div className={cx('mb-12 border-b pb-8', t.divider)}>
        <p className={cx('mb-2 font-mono text-[0.58rem] font-bold uppercase tracking-[0.25em]', t.accent)}>
          // 02 · proceso
        </p>
        <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Listo en 5 minutos.<br />De verdad.
        </h2>
      </div>

      <div className={cx('grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0', isDark ? 'divide-slate-800' : 'divide-stone-200')}>
        {[
          { n: '01', icon: 'bx bx-store',       title: 'Crea tu taller',    desc: 'Registra tu taller en 30 segundos. Sin tarjeta de crédito. Sin instalaciones.' },
          { n: '02', icon: 'bx bx-user-plus',   title: 'Añade a tu equipo', desc: 'Crea cuentas para tus operarios. Ficharán y gestionarán sus OTs desde el móvil.' },
          { n: '03', icon: 'bx bx-check-circle', title: 'Empieza ya',        desc: 'Crea tu primera OT, asigna un operario y sigue el estado en tiempo real desde cualquier pantalla.' },
        ].map(({ n, icon, title, desc }) => (
          <div key={n} className="relative p-8">
            <div className={cx('mb-4 font-mono text-6xl font-black leading-none opacity-[0.08]')}>
              {n}
            </div>
            <div className={cx('mb-4 flex h-10 w-10 items-center justify-center border text-xl', t.accentTint, t.accentBorder, t.accent)}>
              <i className={icon} />
            </div>
            <h3 className="mb-2 text-sm font-black uppercase tracking-wide">{title}</h3>
            <p className={cx('text-xs leading-relaxed', t.muted)}>{desc}</p>
          </div>
        ))}
      </div>

      <div className={cx('mt-10 border-t pt-10 text-center', t.divider)}>
        <Link
          to="/registro"
          className={cx('inline-flex items-center gap-2 rounded-sm px-8 py-3.5 text-sm font-black uppercase tracking-wider shadow-lg transition', t.btnPrimary)}
        >
          <i className="bx bx-rocket" />
          Empezar ahora — gratis
        </Link>
      </div>
    </div>
  </section>
)

// ─── precios ──────────────────────────────────────────────────────────────────

const PricingSection = ({ t }) => (
  <section className={cx('px-6 py-24 transition-colors duration-300', t.sectionAlt)}>
    <div className="mx-auto max-w-6xl">

      <div className={cx('mb-12 flex flex-col justify-between gap-4 border-b pb-8 sm:flex-row sm:items-end', t.divider)}>
        <div>
          <p className={cx('mb-2 font-mono text-[0.58rem] font-bold uppercase tracking-[0.25em]', t.accent)}>
            // 03 · precios
          </p>
          <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Sin sorpresas.<br />Sin letra pequeña.
          </h2>
        </div>
        <p className={cx('hidden text-right text-xs', t.muted)}>
          15 días de prueba gratuita.<br />Sin tarjeta de crédito.
        </p>
      </div>

      <div className={cx('grid md:grid-cols-3')}>
        {PLANS.map(({ name, users, price, features, popular }, i) => (
          <div
            key={name}
            className={cx(
              'relative flex flex-col border p-8 transition-colors',
              popular ? t.planPopular : t.planNormal,
              i > 0 && '-ml-px',
            )}
          >
            {/* Top accent line for popular */}
            {popular && (
              <div className={cx('absolute inset-x-0 top-0 h-[2px]', t.planPopLine)} />
            )}

            <div className="mb-6 space-y-1">
              <p className={cx('font-mono text-[0.52rem] uppercase tracking-[0.2em]', t.monoMuted)}>{users}</p>
              <h3 className="text-lg font-black uppercase tracking-wider">{name}</h3>
              {popular && (
                <span className={cx('inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[0.52rem] font-black uppercase tracking-widest', t.accentBg, t.accentBgText)}>
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
                popular ? t.btnPrimary : t.btnGhost,
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
  <section className={cx('border-y px-6 py-28 text-center transition-colors duration-300', t.divider)}>
    <div className="mx-auto max-w-2xl space-y-6">

      <p className={cx('font-mono text-[0.58rem] font-bold uppercase tracking-[0.25em]', t.accent)}>
        // fin de línea
      </p>

      <h2 className="text-5xl font-black uppercase leading-tight tracking-tighter sm:text-6xl">
        Tu taller,
        <br />
        <span className={t.accent}>en marcha hoy.</span>
      </h2>

      <p className={cx('mx-auto max-w-md text-sm leading-relaxed', t.muted)}>
        Gestiona tus OTs, fichajes y stock desde una sola plataforma.
        Olvídate del papel y del Excel para siempre.
      </p>

      <div className="space-y-3">
        <Link
          to="/registro"
          className={cx('inline-flex items-center gap-2 rounded-sm px-10 py-4 text-sm font-black uppercase tracking-wider shadow-lg transition', t.btnPrimary)}
        >
          <i className="bx bx-rocket text-lg" />
          Crear mi taller gratis
        </Link>
        <p className={cx('text-[0.62rem] font-semibold uppercase tracking-[0.18em]', t.faint)}>
          15 días gratis · Sin tarjeta · Cancela cuando quieras
        </p>
      </div>
    </div>
  </section>
)

// ─── footer ───────────────────────────────────────────────────────────────────

const LandingFooter = ({ t }) => (
  <footer className={cx('border-t px-6 py-8 transition-colors duration-300', t.footerBg, t.divider)}>
    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">

      <div className="flex items-center gap-2">
        <img src="/weldix-icon.svg" alt="Weldix" className="h-5 w-5 shrink-0 opacity-40 object-contain" />
        <span className={cx('font-mono text-[0.52rem] font-bold uppercase tracking-[0.25em]', t.monoMuted)}>WELDIX</span>
      </div>

      <div className={cx('flex items-center gap-6 text-[0.62rem] font-semibold uppercase tracking-[0.12em]', t.faint)}>
        <Link to="/privacidad" className="transition hover:opacity-100">Privacidad</Link>
        <Link to="/terminos" className="transition hover:opacity-100">Términos</Link>
        <Link to="/login" className="transition hover:opacity-100">Acceder</Link>
      </div>

      <p className={cx('font-mono text-[0.52rem] uppercase tracking-widest', t.monoMuted)}>
        © 2026 Weldix
      </p>
    </div>
  </footer>
)

// ─── página principal ─────────────────────────────────────────────────────────

const LandingPage = () => {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('weldix_landing_theme')
    return stored ? stored === 'dark' : true
  })

  const t = isDark ? T.dark : T.light

  const toggleTheme = () => {
    const next = !isDark
    localStorage.setItem('weldix_landing_theme', next ? 'dark' : 'light')
    if (!document.startViewTransition) { setIsDark(next); return }
    document.startViewTransition(() => setIsDark(next))
  }

  return (
    <div className={cx('min-h-screen transition-colors duration-300', t.page)}>
      <NavBar isDark={isDark} onToggle={toggleTheme} t={t} />
      <HeroSection t={t} isDark={isDark} />
      <FeaturesSection t={t} />
      <HowItWorksSection t={t} isDark={isDark} />
      <PricingSection t={t} />
      <CtaSection t={t} />
      <LandingFooter t={t} />
    </div>
  )
}

export default LandingPage
