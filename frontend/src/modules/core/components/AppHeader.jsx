import { cx } from '../lib/cx'

function AppHeader({ roleLabel, timeLabel, userInitials, onLogout }) {
  return (
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
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">{timeLabel}</p>
          <button
            type="button"
            onClick={onLogout}
            className={cx(
              'grid h-8 w-8 place-items-center rounded-full border border-sky-700/40',
              'bg-sky-500/20 text-xs font-bold text-sky-200 transition hover:border-sky-500/70 hover:bg-sky-500/30',
            )}
            title="Cerrar sesion"
          >
            {userInitials}
          </button>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
