import { Link } from 'react-router-dom'

import { authTw, cx } from '../utils/tw'
import Particles from '../../../components/Particles/Particles'
import CountUp from '../../../components/CountUp/CountUp'

function AuthLayout({ mode, title, subtitle, feedback, error, children }) {
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
              particleColors={['#38bdf8', '#7dd3fc', '#ffffff', '#0ea5e9']}
              alphaParticles
              particleBaseSize={80}
              sizeRandomness={0.8}
              disableRotation={false}
            />
          </div>

          <div className={authTw.heroContent}>
            <header className={authTw.logoRow}>
              <img src="/weldix-logo.svg" alt="Weldix" className="h-36 w-auto object-contain" />
            </header>

            <div className={authTw.heroCopyBox}>
              <h2 className={authTw.heroHeadline}>
                Control total
                <br />
                de tu taller.
                <br />
                <span className={authTw.heroAccent}>Sin papel.</span>
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
            <div className={authTw.modeSwitch}>
              <Link
                to="/login"
                className={cx(authTw.modeButtonBase, mode === 'login' ? authTw.modeButtonActive : authTw.modeButtonInactive)}
              >
                Iniciar sesion
              </Link>
              <Link
                to="/register"
                className={cx(authTw.modeButtonBase, mode === 'register' ? authTw.modeButtonActive : authTw.modeButtonInactive)}
              >
                Crear cuenta
              </Link>
            </div>

            <h1 className={authTw.panelTitle}>{title}</h1>
            <p className={authTw.panelSubtitle}>{subtitle}</p>

            {children}

            {(feedback || error) && (
              <p className={cx(authTw.feedbackBase, error ? authTw.feedbackError : authTw.feedbackOk)}>
                {error || feedback}
              </p>
            )}

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
