import { Link, NavLink } from 'react-router-dom'

import { cx } from '../../core/lib/cx'
import { ThemeToggle } from './LandingPage'

const ITEMS = [
  { label: 'Funcionalidades', to: '/funcionalidades' },
  { label: 'Cómo funciona', to: '/como-funciona' },
  { label: 'Precios', to: '/precios' },
  { label: 'FAQs', to: '/faqs' },
]

const LandingNav = ({ t, isDark, onToggle }) => (
  <nav
    style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}
    className={cx(
      'flex items-center justify-between border-b px-6 py-3 transition-colors duration-300',
      t.nav
    )}
  >
    <Link to="/" className="flex items-center gap-3">
      <img src="/weldix-icon.svg" alt="Weldix" className="h-7 w-7 shrink-0 object-contain" />
      <div>
        <p className="font-display text-base font-bold tracking-tight">Weldix</p>
        <p className={cx('text-[0.55rem] font-medium uppercase tracking-[0.18em]', t.monoMuted)}>
          gestión industrial
        </p>
      </div>
    </Link>

    <div className="hidden items-center gap-8 md:flex">
      {ITEMS.map(({ label, to }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cx(
              'text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition',
              isActive ? t.accent : t.navText
            )
          }
        >
          {label}
        </NavLink>
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

export default LandingNav
