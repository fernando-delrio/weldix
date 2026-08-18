import { Outlet } from 'react-router-dom'

import { cx } from '../../core/lib/cx'
import { useTheme } from '../../core/lib/ThemeContext'
import { T } from '../lib/landingTheme'
import { LandingFooter } from './LandingPage'
import LandingNav from './LandingNav'
import LandingChat from './LandingChat'
import ScrollProgress from './ScrollProgress'

// Layout compartido del sitio público: nav + páginas (Outlet) + footer + chat.
// El tema se calcula aquí una vez y se pasa a las páginas por el context del Outlet.
const LandingLayout = () => {
  const { isDark, toggleTheme } = useTheme()
  const t = isDark ? T.dark : T.light

  return (
    <>
      <ScrollProgress />
      <LandingNav t={t} isDark={isDark} onToggle={toggleTheme} />
      <div className={cx('min-h-screen transition-colors duration-300', t.page)}>
        <Outlet context={{ t, isDark }} />
      </div>
      <LandingFooter t={t} isDark={isDark} />
      <LandingChat t={t} />
    </>
  )
}

export default LandingLayout
