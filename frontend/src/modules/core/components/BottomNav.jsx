import { Link, useLocation } from 'react-router-dom'

import { cx } from '../lib/cx'

function BottomNav({ items }) {
  const location = useLocation()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-cyan-950/70 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto grid h-[72px] w-full max-w-[980px] grid-cols-4 px-2">
        {items.map((item) => {
          const isActive =
            location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)

          return (
            <Link
              key={item.key}
              to={item.to}
              className={cx(
                'mx-1 my-1.5 flex flex-col items-center justify-center rounded-xl transition',
                isActive
                  ? 'bg-sky-500/20 text-sky-300 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.4)]'
                  : 'text-slate-500 hover:text-slate-300',
              )}
            >
              <span className="text-[0.58rem] font-bold tracking-[0.2em]">{item.icon}</span>
              <span className="mt-1 text-[0.62rem] font-semibold tracking-[0.12em]">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
