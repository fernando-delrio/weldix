import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { useTheme } from '../lib/ThemeContext'
import { cx } from '../lib/cx'
import { T } from '../../landing/lib/landingTheme'
import { LandingFooter } from '../../landing/components/LandingPage'
import LandingNav from '../../landing/components/LandingNav'
import AppShell from './AppShell'

// Visitante sin cuenta: mismo nav/footer que el resto del sitio público.
const PublicShell = ({ children }) => {
  const { isDark, toggleTheme } = useTheme()
  const t = isDark ? T.dark : T.light

  return (
    <>
      <LandingNav t={t} isDark={isDark} onToggle={toggleTheme} />
      <div className={cx('min-h-screen px-6 pb-24 pt-28 transition-colors duration-300', t.page)}>
        {children}
      </div>
      <LandingFooter t={t} isDark={isDark} />
    </>
  )
}

// Legal: la misma página cambia de chrome según haya sesión o no — nunca
// enseña la navegación de la app (sidebar, campana, IA) a un visitante que
// no puede entrar a esas rutas.
const LegalPageLayout = ({ children }) => {
  const { token } = useAuthSession()
  return token ? <AppShell>{children}</AppShell> : <PublicShell>{children}</PublicShell>
}

export default LegalPageLayout
