import { Link } from 'react-router-dom'

import { authTw, cx } from '../utils/tw'
import Particles from '../../../components/Particles/Particles'
import CountUp from '../../../components/CountUp/CountUp'
import WordReveal from '../../core/components/WordReveal'
import { useTheme } from '../../core/lib/ThemeContext'

const modeButtonClass = (currentMode, targetMode) =>
  cx(
    authTw.modeButtonBase,
    currentMode === targetMode ? authTw.modeButtonActive : authTw.modeButtonInactive
  )

const feedbackMessage = ({ feedback, error }) =>
  (feedback || error) && (
    <p className={cx(authTw.feedbackBase, error ? authTw.feedbackError : authTw.feedbackOk)}>
      {error || feedback}
    </p>
  )

const AuthLayout = ({ mode, title, subtitle, feedback, error, children }) => {
  const { isDark } = useTheme()

  return (
    <main className={authTw.pageRoot}>
      <div className={authTw.twoColumnGrid}>
        <section className={authTw.heroSection}>
          <div className={authTw.heroGlow} />
          <div className={authTw.heroGridOverlay} />
          <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
            <Particles
              particleCount={120}
              particleSpread={8}
              speed={0.06}
              particleColors={['#f59e0b', '#fbbf24', '#ffffff', '#d97706']}
              alphaParticles
              particleBaseSize={80}
              sizeRandomness={0.8}
              disableRotation={false}
            />
          </div>

          <div className={authTw.heroContent}>
            <div className={authTw.logoRow}>
              <img
                src={isDark ? '/weldix-logo-white.svg' : '/weldix-logo.svg'}
                alt="Weldix"
                className="h-36 w-auto object-contain"
              />
            </div>

            <div className={authTw.heroCopyBox}>
              <h2 className={authTw.heroHeadline}>
                <WordReveal text="Control total" className="block" initialDelay={0} />
                <WordReveal text="de tu taller." className="block" initialDelay={0.3} />
                <WordReveal
                  text="Sin papel."
                  className={cx('block', authTw.heroAccent)}
                  initialDelay={0.6}
                />
              </h2>
              <p className={authTw.heroParagraph}>
                Gestiona trabajos, materiales y equipos desde una sola plataforma para soldadura y
                caldereria industrial.
              </p>
            </div>

            <div className={authTw.metricRow}>
              <div>
                <strong className={authTw.metricValue}>
                  <CountUp from={0} to={100} duration={2} />%
                </strong>
                <small className={authTw.metricLabel}>WEB SIN INSTALAR</small>
              </div>
              <div>
                <strong className={authTw.metricValue}>IA</strong>
                <small className={authTw.metricLabel}>INTEGRADA</small>
              </div>
              <div>
                <strong className={authTw.metricValue}>v1.0</strong>
                <small className={authTw.metricLabel}>PRODUCCION</small>
              </div>
            </div>
          </div>
        </section>

        <section className={authTw.panelSection}>
          <div className={authTw.panelCard}>
            <Link
              to="/"
              className="mb-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500 transition hover:text-slate-300"
            >
              <i className="bx bx-arrow-back text-sm" />
              Volver al inicio
            </Link>
            <div className={authTw.modeSwitch}>
              <Link to="/login" className={modeButtonClass(mode, 'login')}>
                Iniciar sesion
              </Link>
              <Link to="/registro" className={modeButtonClass(mode, 'register')}>
                Registrar taller
              </Link>
            </div>

            <h1 className={authTw.panelTitle}>{title}</h1>
            <p className={authTw.panelSubtitle}>{subtitle}</p>

            {children}

            {feedbackMessage({ feedback, error })}

            <div className={authTw.footerRow}>
              <small className={authTw.footerVersion}>WELDIX v1.0</small>
              <span className={authTw.footerStatus}>
                <i className={authTw.footerDot} />
                Sistemas operativos
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default AuthLayout
