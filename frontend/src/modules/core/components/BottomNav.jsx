import { Link, useLocation } from 'react-router-dom'
import { NavIcon } from '../lib/icons'
import { cx } from '../lib/cx'

const BottomNav = ({ items }) => {
  const location = useLocation()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-cyan-950/70 bg-slate-950/95 backdrop-blur">
      <div
        className="mx-auto h-[68px] w-full max-w-[980px] px-1"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const isActive =
            location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)

          return (
            <Link
              key={item.key}
              to={item.to}
              className={cx(
                'mx-0.5 my-1.5 flex flex-col items-center justify-center gap-1 rounded-xl transition',
                isActive
                  ? 'bg-sky-500/20 text-sky-300 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.4)]'
                  : 'text-slate-500 hover:text-slate-300',
              )}
            >
              <NavIcon itemKey={item.key} className="h-[18px] w-[18px] shrink-0" />
              <span className="text-[0.6rem] font-semibold tracking-[0.1em]">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
