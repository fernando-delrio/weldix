import { cx } from '../lib/cx'

const AppHeader = ({ roleLabel, timeLabel, onLogout, onSearchOpen }) => (
  <header className="fixed inset-x-0 top-0 z-40 border-b border-cyan-950/70 bg-slate-950/95 backdrop-blur">
    <div className="mx-auto flex h-16 w-full max-w-[980px] items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <img src="/weldix-icon.svg" alt="Weldix" className="h-9 w-9 object-contain" />
        <div className="flex items-center gap-3">
          <p className="text-sm font-extrabold tracking-[0.18em] text-slate-100">WELDIX</p>
          <span className="rounded border border-sky-700/60 bg-sky-500/10 px-2 py-0.5 text-[0.62rem] font-bold tracking-[0.18em] text-sky-300">
            {roleLabel}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <p className="hidden text-xs font-semibold tracking-[0.12em] text-slate-400 sm:block">
          {timeLabel}
        </p>

        {/* Botón búsqueda — también responde a Ctrl+K */}
        <button
          type="button"
          onClick={onSearchOpen}
          className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-[0.65rem] text-slate-400 transition hover:border-sky-600/50 hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          title="Buscar (Ctrl+K)"
          aria-label="Buscar (Ctrl+K)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-3.5 w-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <span className="hidden sm:inline">Buscar</span>
          <kbd className="hidden rounded border border-slate-600 px-1 py-0.5 text-[0.55rem] text-slate-500 sm:inline">
            Ctrl+K
          </kbd>
        </button>

        <button
          type="button"
          onClick={onLogout}
          aria-label="Cerrar sesión"
          className={cx(
            'flex items-center gap-1.5 rounded-lg border border-slate-600/60 bg-slate-800/80',
            'px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-300',
            'transition hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400'
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5 shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z"
              clipRule="evenodd"
            />
            <path
              fillRule="evenodd"
              d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-1.068a.75.75 0 1 0-1.004-1.115l-2.5 2.25a.75.75 0 0 0 0 1.115l2.5 2.25a.75.75 0 1 0 1.004-1.115L8.704 10.75H18.25A.75.75 0 0 0 19 10Z"
              clipRule="evenodd"
            />
          </svg>
          Salir
        </button>
      </div>
    </div>
  </header>
)

export default AppHeader
