import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cx } from '../lib/cx'

const LEVEL_CFG = {
  warning: { icon: 'bx bx-error', color: 'text-amber-400' },
  error: { icon: 'bx bx-error-circle', color: 'text-rose-400' },
}

const AlertItem = ({ alert, onNavigate }) => {
  const cfg = LEVEL_CFG[alert.level] ?? LEVEL_CFG.warning
  return (
    <button
      type="button"
      onClick={() => onNavigate(alert.link)}
      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-800/60"
    >
      <i className={cx(cfg.icon, cfg.color, 'mt-0.5 shrink-0 text-base')} aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-200">{alert.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{alert.body}</p>
      </div>
    </button>
  )
}

const emptyState = () => (
  <div className="flex flex-col items-center gap-2 py-8 text-center">
    <i className="bx bx-check-circle text-2xl text-emerald-500" aria-hidden="true" />
    <p className="text-xs font-semibold text-slate-300">Todo al día</p>
    <p className="text-xs text-slate-600">Sin avisos pendientes</p>
  </div>
)

// Recibe estado como props — useNotifications vive en AppShell para evitar
// múltiples conexiones WS (sidebar + topbar comparten la misma instancia)
const NotificationBell = ({ alerts = [], unread = 0, onRead, compact = false }) => {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleOutside = (e) => !panelRef.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const toggle = () => {
    const next = !open
    setOpen(next)
    next && onRead?.()
  }

  const handleAlertClick = (link) => {
    setOpen(false)
    navigate(link)
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notificaciones${unread ? ` — ${unread} sin leer` : ''}`}
        aria-expanded={open}
        className={cx(
          'relative transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400',
          compact
            ? 'grid h-11 w-11 place-items-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-400 hover:text-slate-200'
            : 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-slate-500 hover:bg-slate-800/70 hover:text-slate-300'
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={compact ? 2 : 1.8}
          stroke="currentColor"
          className={compact ? 'h-4 w-4' : 'h-5 w-5 shrink-0'}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {!compact && (
          <span className="hidden text-sm font-semibold tracking-wide lg:block">Avisos</span>
        )}
        {unread > 0 && (
          <span
            className={cx(
              'absolute flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white',
              compact ? 'right-1.5 top-1.5' : 'right-2 top-1.5'
            )}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cx(
            'absolute z-50 mt-2 flex w-72 flex-col rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl',
            compact ? 'right-0' : 'left-0'
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Avisos</p>
            {alerts.length > 0 && (
              <button
                type="button"
                onClick={onRead}
                className="text-xs text-sky-400 transition hover:text-sky-300"
              >
                Marcar leídas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto py-2">
            {alerts.length === 0
              ? emptyState()
              : alerts.map((a) => <AlertItem key={a.id} alert={a} onNavigate={handleAlertClick} />)}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
