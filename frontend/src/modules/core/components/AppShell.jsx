import { Link, useLocation } from 'react-router-dom'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { useClock } from '../hooks/useClock'
import { useSearch } from '../hooks/useSearch'
import IaChatPanel from '../../ia/components/IaChatPanel'
import { IaProvider, useIaContext } from '../../ia/lib/IaContext'
import BottomNav from './BottomNav'
import SearchModal from './SearchModal'
import { getNavItems } from '../lib/navigation'
import { NavIcon } from '../lib/icons'
import { cx } from '../lib/cx'

// ── Sidebar — visible en md+ ────────────────────────────────────────────────
const Sidebar = ({ navItems, roleLabel, onLogout, onSearchOpen, timeLabel }) => {
  const location = useLocation()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r border-cyan-950/60 bg-slate-950/98 backdrop-blur lg:w-56">

      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-cyan-950/60 px-4">
        <img src="/weldix-icon.svg" alt="Weldix" className="h-8 w-8 shrink-0 object-contain" />
        <div className="hidden lg:block">
          <p className="text-sm font-extrabold tracking-[0.18em] text-slate-100">WELDIX</p>
          <span className="rounded border border-sky-700/60 bg-sky-500/10 px-1.5 py-0.5 text-[0.55rem] font-bold tracking-[0.18em] text-sky-300">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 pt-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
          return (
            <Link
              key={item.key}
              to={item.to}
              title={item.label}
              className={cx(
                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition overflow-hidden',
                isActive
                  ? 'bg-sky-500/15 text-sky-300 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.3)]'
                  : 'text-slate-500 hover:bg-slate-800/70 hover:text-slate-300',
              )}
            >
              {/* Barra vertical de acento — visible solo en item activo */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-sky-400" aria-hidden="true" />
              )}
              <NavIcon itemKey={item.key} />
              <span className="hidden text-sm font-semibold tracking-wide lg:block">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="shrink-0 space-y-1 border-t border-cyan-950/60 p-2">
        {/* Búsqueda */}
        <button
          type="button"
          onClick={onSearchOpen}
          title="Buscar (Ctrl+K)"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 transition hover:bg-slate-800/70 hover:text-slate-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <span className="hidden text-sm font-semibold tracking-wide lg:block">Buscar</span>
        </button>

        {/* Campana de notificaciones — placeholder Fase 5 */}
        <button
          type="button"
          title="Notificaciones"
          aria-label="Notificaciones"
          className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 transition hover:bg-slate-800/70 hover:text-slate-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <span className="hidden text-sm font-semibold tracking-wide lg:block">Avisos</span>
        </button>

        {/* Cerrar sesión */}
        <button
          type="button"
          onClick={onLogout}
          title="Cerrar sesión"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
          </svg>
          <span className="hidden text-sm font-semibold tracking-wide lg:block">Salir</span>
        </button>

        {/* Reloj — solo en desktop */}
        <p className="hidden px-3 py-1 text-[0.6rem] font-semibold tracking-widest text-slate-600 lg:block">{timeLabel}</p>
      </div>
    </aside>
  )
}

// ── Header móvil ────────────────────────────────────────────────────────────
const MobileHeader = ({ roleLabel, onLogout, onSearchOpen }) => (
  <header className="fixed inset-x-0 top-0 z-40 border-b border-cyan-950/70 bg-slate-950/95 backdrop-blur md:hidden">
    <div className="flex h-14 items-center justify-between px-4">
      <div className="flex items-center gap-2.5">
        <img src="/weldix-icon.svg" alt="Weldix" className="h-7 w-7 object-contain" />
        <p className="text-sm font-extrabold tracking-[0.18em] text-slate-100">WELDIX</p>
        <span className="rounded border border-sky-700/60 bg-sky-500/10 px-1.5 py-0.5 text-[0.55rem] font-bold tracking-[0.18em] text-sky-300">
          {roleLabel}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSearchOpen}
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-400"
          aria-label="Buscar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </button>
        {/* Campana — placeholder Fase 5 */}
        <button
          type="button"
          className="relative grid h-8 w-8 place-items-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-400"
          aria-label="Notificaciones"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-400 hover:text-rose-400"
          aria-label="Cerrar sesión"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
          </svg>
        </button>
      </div>
    </div>
  </header>
)

// ── FAB IA ─────────────────────────────────────────────────────────────────
const IaFab = () => {
  const { openChat } = useIaContext()
  return (
    <button
      type="button"
      onClick={() => openChat()}
      className="fixed bottom-[88px] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-sky-500/40 bg-sky-500/20 text-xl shadow-lg backdrop-blur transition hover:border-sky-400/70 hover:bg-sky-500/30 md:bottom-6 md:right-6"
      title="Asistente IA"
    >
      🔧
    </button>
  )
}

// ── Shell principal ─────────────────────────────────────────────────────────
const AppShellInner = ({ children }) => {
  const { profile, clearSession } = useAuthSession()
  const timeLabel = useClock()
  const { isOpen: iaIsOpen } = useIaContext()
  const search = useSearch()

  const role      = profile?.role || 'operario'
  const roleLabel = role.toUpperCase()
  const navItems  = getNavItems(role)

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      {/* Efectos de fondo */}
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:linear-gradient(rgba(3,38,66,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(3,38,66,0.45)_1px,transparent_1px)] [background-size:30px_30px]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(700px_430px_at_50%_0%,rgba(14,165,233,0.18),transparent_68%)]" />

      {/* Header móvil */}
      <MobileHeader
        roleLabel={roleLabel}
        onLogout={clearSession}
        onSearchOpen={search.open}
      />

      {/* Sidebar tablet/desktop */}
      <div className="hidden md:block">
        <Sidebar
          navItems={navItems}
          roleLabel={roleLabel}
          timeLabel={timeLabel}
          onLogout={clearSession}
          onSearchOpen={search.open}
        />
      </div>

      {/* Contenido principal */}
      <main className={[
        'relative min-h-screen',
        // Móvil: padding top por header + bottom por BottomNav
        'pt-[62px] pb-[90px] px-4',
        // Tablet: sidebar 64px + padding propio
        'md:ml-16 md:pt-6 md:pb-8 md:px-6',
        // Desktop: sidebar 224px
        'lg:ml-56 lg:px-8',
      ].join(' ')}>
        <div className="mx-auto w-full max-w-[1100px]">
          {children}
        </div>
      </main>

      {/* Bottom nav — solo móvil */}
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
