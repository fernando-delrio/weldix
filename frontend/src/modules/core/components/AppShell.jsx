import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
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
      className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-slate-500 transition hover:bg-slate-800/70 hover:text-slate-300"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
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
}) => {
  const location = useLocation()

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-950/98 backdrop-blur">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800 px-4">
        <img src="/weldix-icon.svg" alt="Weldix" className="h-8 w-8 shrink-0 object-contain" />
        <div className="hidden lg:block">
          <p className="text-sm font-extrabold tracking-[0.18em] text-slate-100">WELDIX</p>
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
              className={cx(
                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition overflow-hidden',
                isActive
                  ? 'bg-amber-500/15 text-amber-400 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.25)]'
                  : 'text-slate-500 hover:bg-slate-800/70 hover:text-slate-300'
              )}
            >
              {/* Barra vertical de acento — visible solo en item activo */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-amber-400"
                  aria-hidden="true"
                />
              )}
              <NavIcon itemKey={item.key} />
              <span className="hidden text-sm font-semibold tracking-wide lg:block">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="shrink-0 space-y-1 border-t border-slate-800 p-2">
        {/* Búsqueda */}
        <button
          type="button"
          onClick={onSearchOpen}
          title="Buscar (Ctrl+K)"
          aria-label="Buscar (Ctrl+K)"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 transition hover:bg-slate-800/70 hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
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
          <span className="hidden text-sm font-semibold tracking-wide lg:block">Buscar</span>
        </button>

        {/* Campana de notificaciones — placeholder Fase 5 */}
        <button
          type="button"
          title="Notificaciones"
          aria-label="Notificaciones"
          className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 transition hover:bg-slate-800/70 hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
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
              d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
            />
          </svg>
          <span className="hidden text-sm font-semibold tracking-wide lg:block">Avisos</span>
        </button>

        {/* Instalar PWA — solo aparece cuando el browser lo permite */}
        {canInstall && (
          <button
            type="button"
            onClick={onInstall}
            title="Instalar app"
            aria-label="Instalar app"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sky-400 transition hover:bg-sky-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
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
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
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
          <span className="hidden text-sm font-semibold tracking-wide lg:block">Salir</span>
        </button>

        {/* Reloj — visible en tablet y desktop */}
        <p className="hidden px-3 py-1 font-mono text-xs font-semibold tracking-widest text-slate-400 md:block">
          {timeLabel}
        </p>
      </div>
    </aside>
  )
}

// ── Header móvil ────────────────────────────────────────────────────────────
const MobileHeader = ({ roleLabel, onLogout, onSearchOpen, timeLabel }) => (
  <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur md:hidden">
    <div className="relative flex h-14 items-center justify-between px-4">
      <div className="flex items-center gap-2.5">
        <img src="/weldix-icon.svg" alt="Weldix" className="h-7 w-7 object-contain" />
        <p className="text-sm font-extrabold tracking-[0.18em] text-slate-100">WELDIX</p>
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
        {/* Campana — placeholder Fase 5 */}
        <button
          type="button"
          className="relative grid h-11 w-11 place-items-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          aria-label="Notificaciones"
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
              d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
            />
          </svg>
        </button>
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
const IaFab = () => {
  const { openChat } = useIaContext()
  return createPortal(
    <button
      type="button"
      onClick={() => openChat()}
      aria-label="Asistente IA"
      style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999 }}
      className="flex h-12 w-12 items-center justify-center rounded-sm border border-amber-500/40 bg-amber-500/15 shadow-lg backdrop-blur transition hover:border-amber-400/70 hover:bg-amber-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-sm animate-ping bg-amber-500/20"
        aria-hidden="true"
      />
      <i className="bx bx-bot relative text-xl text-amber-400" aria-hidden="true" />
    </button>,
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
  const { isDark } = useTheme()

  const role = profile?.role || 'operario'
  const roleLabel = role.toUpperCase()
  const navItems = getNavItems(role)

  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      {/* Efectos de fondo — solo en modo oscuro */}
      {isDark && (
        <>
          <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:linear-gradient(rgba(3,38,66,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(3,38,66,0.45)_1px,transparent_1px)] [background-size:30px_30px]" />
          <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(700px_430px_at_0%_50%,rgba(245,158,11,0.07),transparent_65%)]" />
        </>
      )}

      {/* Sidebar tablet/desktop — flex child, fills full height */}
      <div className="hidden md:flex md:w-16 lg:w-56 shrink-0 flex-col">
        <Sidebar
          navItems={navItems}
          roleLabel={roleLabel}
          timeLabel={timeLabel}
          onLogout={clearSession}
          onSearchOpen={search.open}
          canInstall={canInstall}
          onInstall={triggerInstall}
        />
      </div>

      {/* Columna de contenido — ocupa todo el espacio restante */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Espaciador para el header fijo en móvil */}
        <div className="h-14 shrink-0 md:hidden" aria-hidden="true" />

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6 md:py-4 lg:px-8">
          <div className="mx-auto w-full max-w-[1100px]">
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
      />
      <div className="md:hidden">
        <BottomNav items={navItems} />
      </div>
      <IaFab />
      {iaIsOpen && <IaChatPanel />}
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
