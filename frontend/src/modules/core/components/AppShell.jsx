import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { useClock } from '../hooks/useClock'
import { useSearch } from '../hooks/useSearch'
import usePwaInstall from '../hooks/usePwaInstall'
import IaChatPanel from '../../ia/components/IaChatPanel'
import { IaProvider, useIaContext } from '../../ia/lib/IaContext'
import BottomNav from './BottomNav'
import SearchModal from './SearchModal'
import TrialBanner from './TrialBanner'
import { getNavItems } from '../lib/navigation'
import { NavIcon } from '../lib/icons'
import { cx } from '../lib/cx'
import useTrialStatus from '../hooks/useTrialStatus'
import useNotifications from '../hooks/useNotifications'
import NotificationBell from './NotificationBell'
import { useTheme } from '../lib/ThemeContext'

const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.8}
    stroke="currentColor"
    className="h-5 w-5 shrink-0"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
    />
  </svg>
)

const MoonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.8}
    stroke="currentColor"
    className="h-5 w-5 shrink-0"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
    />
  </svg>
)

// compact=true → icono solo (mobile header) | false → icono + label (sidebar)
const ThemeToggleBtn = ({ compact = false }) => {
  const { isDark, toggleTheme } = useTheme()
  const label = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        className="grid h-11 w-11 place-items-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-400 transition hover:text-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="flex w-full flex-col items-center justify-center gap-0.5 rounded-lg py-3 min-h-14 text-slate-500 transition hover:bg-slate-800/70 hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5 lg:min-h-0"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      <span className="block text-[10px] font-semibold leading-tight text-center lg:hidden">
        {isDark ? 'Claro' : 'Oscuro'}
      </span>
      <span className="hidden text-sm font-semibold tracking-wide lg:block">
        {isDark ? 'Modo claro' : 'Modo oscuro'}
      </span>
    </button>
  )
}

// ── Sidebar — visible en md+ ────────────────────────────────────────────────
const Sidebar = ({
  navItems,
  roleLabel,
  onLogout,
  onSearchOpen,
  timeLabel,
  onInstall,
  canInstall,
  alerts,
  unread,
  onRead,
  isDark,
}) => {
  const location = useLocation()

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-950/98 backdrop-blur">
      {/* Logo — icono solo cuando está colapsado (md), wordmark completo en lg+ */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800 px-4">
        <img
          src="/weldix-icon.svg"
          alt="Weldix"
          className="h-8 w-8 shrink-0 object-contain lg:hidden"
        />
        <div className="hidden items-center gap-3 lg:flex">
          <img
            src={isDark ? '/weldix-logo-white.svg' : '/weldix-logo.svg'}
            alt="Weldix"
            className="h-7 w-auto object-contain"
          />
          <span className="rounded-sm border border-amber-700/50 bg-amber-500/10 px-1.5 py-0.5 text-xs font-bold tracking-[0.12em] text-amber-400">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 pt-3">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
          return (
            <Link
              key={item.key}
              to={item.to}
              title={item.label}
              data-tour={`nav-${item.key}`}
              className={cx(
                'relative flex rounded-lg transition overflow-hidden',
                // md: icono + etiqueta apilados, centrados, target ≥56px
                'flex-col items-center justify-center gap-0.5 py-3 px-1 min-h-14',
                // lg: icono + etiqueta en línea, alineados a la izquierda
                'lg:flex-row lg:items-center lg:justify-start lg:gap-3 lg:py-2.5 lg:px-3 lg:min-h-0',
                isActive
                  ? 'bg-amber-500/15 text-amber-400 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.20)]'
                  : 'text-slate-500 hover:bg-slate-800/70 hover:text-slate-300'
              )}
            >
              {/* Barra de acento — solo visible en lg (layout horizontal) */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-amber-400 hidden lg:block"
                  aria-hidden="true"
                />
              )}
              <NavIcon itemKey={item.key} className="h-5 w-5 shrink-0" />
              {/* Etiqueta corta bajo el icono — solo en tablet (md), oculta en desktop (lg) */}
              <span className="block text-[10px] font-semibold leading-tight text-center truncate w-full px-0.5 lg:hidden">
                {item.label}
              </span>
              {/* Etiqueta completa en línea — solo en desktop (lg) */}
              <span className="hidden text-sm font-semibold tracking-wide lg:block">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions — misma lógica que nav items: apilado en tablet, horizontal en desktop */}
      <div className="shrink-0 space-y-1 border-t border-slate-800 p-2">
        {/* Búsqueda */}
        <button
          type="button"
          onClick={onSearchOpen}
          title="Buscar (Ctrl+K)"
          aria-label="Buscar (Ctrl+K)"
          className="flex w-full flex-col items-center justify-center gap-0.5 rounded-lg py-3 min-h-14 text-slate-500 transition hover:bg-slate-800/70 hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5 lg:min-h-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="h-5 w-5 shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <span className="block text-[10px] font-semibold leading-tight text-center lg:hidden">
            Buscar
          </span>
          <span className="hidden text-sm font-semibold tracking-wide lg:block">Buscar</span>
        </button>

        <NotificationBell alerts={alerts} unread={unread} onRead={onRead} />

        {/* Instalar PWA — solo aparece cuando el browser lo permite */}
        {canInstall && (
          <button
            type="button"
            onClick={onInstall}
            title="Instalar app"
            aria-label="Instalar app"
            className="flex w-full flex-col items-center justify-center gap-0.5 rounded-lg py-3 min-h-14 text-sky-400 transition hover:bg-sky-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5 lg:min-h-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="h-5 w-5 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            <span className="block text-[10px] font-semibold leading-tight text-center lg:hidden">
              Instalar
            </span>
            <span className="hidden text-sm font-semibold tracking-wide lg:block">
              Instalar app
            </span>
          </button>
        )}

        {/* Tema */}
        <ThemeToggleBtn />

        {/* Cerrar sesión */}
        <button
          type="button"
          onClick={onLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="flex w-full flex-col items-center justify-center gap-0.5 rounded-lg py-3 min-h-14 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5 lg:min-h-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="h-5 w-5 shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"
            />
          </svg>
          <span className="block text-[10px] font-semibold leading-tight text-center lg:hidden">
            Salir
          </span>
          <span className="hidden text-sm font-semibold tracking-wide lg:block">Salir</span>
        </button>

        {/* Reloj — solo desktop (en tablet no cabe bien en modo icono) */}
        <p className="hidden px-3 py-1 font-mono text-xs font-semibold tracking-widest text-slate-400 lg:block">
          {timeLabel}
        </p>
      </div>
    </aside>
  )
}

// ── Header móvil ────────────────────────────────────────────────────────────
const MobileHeader = ({
  roleLabel,
  onLogout,
  onSearchOpen,
  timeLabel,
  alerts,
  unread,
  onRead,
  isDark,
}) => (
  <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur md:hidden">
    <div className="relative flex h-14 items-center justify-between px-4">
      <div className="flex items-center gap-2.5">
        <img
          src={isDark ? '/weldix-logo-white.svg' : '/weldix-logo.svg'}
          alt="Weldix"
          className="h-7 w-auto object-contain"
        />
        <span className="rounded-sm border border-amber-700/50 bg-amber-500/10 px-1.5 py-0.5 text-xs font-bold tracking-[0.12em] text-amber-400">
          {roleLabel}
        </span>
      </div>

      {/* Reloj centrado */}
      <span className="absolute left-1/2 -translate-x-1/2 font-mono text-xs font-semibold tracking-widest text-slate-400">
        {timeLabel}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSearchOpen}
          className="grid h-11 w-11 place-items-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          aria-label="Buscar"
        >
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
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
        </button>
        <NotificationBell alerts={alerts} unread={unread} onRead={onRead} compact />
        <ThemeToggleBtn compact />
        <button
          type="button"
          onClick={onLogout}
          className="grid h-11 w-11 place-items-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-400 hover:text-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
          aria-label="Cerrar sesión"
        >
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
              d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"
            />
          </svg>
        </button>
      </div>
    </div>
  </header>
)

// ── FAB IA ─────────────────────────────────────────────────────────────────
const SPRING = { type: 'spring', damping: 26, stiffness: 140 }
const MotionButton = motion.button

const IaFab = () => {
  const { openChat, isOpen } = useIaContext()
  return createPortal(
    <AnimatePresence>
      {!isOpen && (
        <MotionButton
          key="ia-fab"
          layoutId="ia-panel"
          type="button"
          onClick={() => openChat()}
          aria-label="Asistente IA"
          style={{ zIndex: 9999 }}
          className="fixed bottom-24 right-8 md:bottom-8 flex h-12 w-12 items-center justify-center rounded-lg border border-amber-500/30 bg-slate-900 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          transition={SPRING}
        >
          <i className="bx bx-bot text-xl text-amber-400" aria-hidden="true" />
        </MotionButton>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ── Shell principal ─────────────────────────────────────────────────────────
const AppShellInner = ({ children }) => {
  const { profile, clearSession } = useAuthSession()
  const timeLabel = useClock()
  const { isOpen: iaIsOpen } = useIaContext()
  const search = useSearch()
  const { canInstall, triggerInstall } = usePwaInstall()
  const { showBanner, trial, dismiss } = useTrialStatus()
  const { alerts, unread, markAllRead } = useNotifications()
  const { isDark } = useTheme()
  const location = useLocation()

  const role = profile?.role || 'operario'
  const roleLabel = role.toUpperCase()
  const navItems = getNavItems(role)

  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      {/* Glow sutil — solo en modo oscuro, sin grid */}
      {isDark && (
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(600px_400px_at_0%_60%,rgba(245,158,11,0.05),transparent_60%)]" />
      )}

      {/* Sidebar tablet/desktop — flex child, fills full height */}
      <div className="hidden md:flex md:w-18 lg:w-56 shrink-0 flex-col">
        <Sidebar
          navItems={navItems}
          roleLabel={roleLabel}
          timeLabel={timeLabel}
          onLogout={clearSession}
          onSearchOpen={search.open}
          canInstall={canInstall}
          onInstall={triggerInstall}
          alerts={alerts}
          unread={unread}
          onRead={markAllRead}
          isDark={isDark}
        />
      </div>

      {/* Columna de contenido — ocupa todo el espacio restante */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Espaciador para el header fijo en móvil */}
        <div className="h-14 shrink-0 md:hidden" aria-hidden="true" />

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6 md:py-4 lg:px-8">
          <div key={location.pathname} className="page-enter mx-auto w-full max-w-[1100px]">
            {showBanner && <TrialBanner daysLeft={trial.days_left} onDismiss={dismiss} />}
            {children}
          </div>
        </main>

        {/* Espaciador para el bottom nav fijo en móvil */}
        <div className="h-[68px] shrink-0 md:hidden" aria-hidden="true" />
      </div>

      {/* Overlays fijos — siempre relativos al viewport */}
      <MobileHeader
        roleLabel={roleLabel}
        onLogout={clearSession}
        onSearchOpen={search.open}
        timeLabel={timeLabel}
        alerts={alerts}
        unread={unread}
        onRead={markAllRead}
        isDark={isDark}
      />
      <div className="md:hidden">
        <BottomNav items={navItems} />
      </div>
      <IaFab />
      <AnimatePresence>{iaIsOpen && <IaChatPanel key="ia-panel" />}</AnimatePresence>
      <SearchModal {...search} />
    </div>
  )
}

const AppShell = ({ children }) => (
  <IaProvider>
    <AppShellInner>{children}</AppShellInner>
  </IaProvider>
)

export default AppShell
