import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import { API_BASE_URL } from '../../shared/api'
import { authTw, cx } from './tw'

const itemMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
}

const MotionSection = motion.section
const MotionHeader = motion.header
const MotionDiv = motion.div

function AuthLayout({
  mode,
  title,
  subtitle,
  feedback,
  error,
  token,
  profile,
  isFetchingProfile,
  onLogout,
  children,
}) {
  return (
    <main className={authTw.pageRoot}>
      <div className={authTw.twoColumnGrid}>
        <MotionSection
          initial={{ opacity: 0, x: -26 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className={authTw.heroSection}
        >
          <div className={authTw.heroGlow} />
          <div className={authTw.heroGridOverlay} />

          <div className={authTw.heroContent}>
            <MotionHeader {...itemMotion} transition={{ duration: 0.45, delay: 0.1 }} className={authTw.logoRow}>
              <div className={authTw.logoBadge}>W</div>
              <div>
                <p className={authTw.brandTitle}>WELDIX</p>
                <p className={authTw.brandSubtitle}>INDUSTRIAL MANAGEMENT</p>
              </div>
            </MotionHeader>

            <MotionDiv {...itemMotion} transition={{ duration: 0.5, delay: 0.2 }} className={authTw.heroCopyBox}>
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
            </MotionDiv>

            <MotionDiv {...itemMotion} transition={{ duration: 0.5, delay: 0.3 }} className={authTw.metricRow}>
              {[
                { value: '100%', label: 'WEB SIN INSTALAR' },
                { value: 'IA', label: 'INTEGRADA' },
                { value: 'v1.0', label: 'PRODUCCION' },
              ].map((metric) => (
                <div key={metric.value}>
                  <strong className={authTw.metricValue}>{metric.value}</strong>
                  <small className={authTw.metricLabel}>{metric.label}</small>
                </div>
              ))}
            </MotionDiv>
          </div>
        </MotionSection>

        <MotionSection
          initial={{ opacity: 0, x: 26 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className={authTw.panelSection}
        >
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className={authTw.panelCard}
          >
            <div className={authTw.modeSwitch}>
              <Link to="/login" className={cx(authTw.modeButtonBase, mode === 'login' ? authTw.modeButtonActive : authTw.modeButtonInactive)}>
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
              <p className={cx(authTw.feedbackBase, error ? authTw.feedbackError : authTw.feedbackOk)}>{error || feedback}</p>
            )}

            <div className={authTw.sessionBox}>
              <p className={authTw.sessionText}>API: {API_BASE_URL}</p>
              <p className={authTw.sessionText}>
                Estado: {isFetchingProfile ? 'Comprobando sesion...' : token ? 'Autenticado' : 'No autenticado'}
              </p>
              <p className={authTw.sessionText}>
                Usuario: {profile ? `${profile.email} (${profile.role})` : '-'}
              </p>
              <button type="button" className={authTw.logoutButton} onClick={onLogout} disabled={!token}>
                Cerrar sesion
              </button>
            </div>

            <div className={authTw.footerRow}>
              <small className={authTw.footerVersion}>WELDIX v1.0</small>
              <span className={authTw.footerStatus}>
                <i className={authTw.footerDot} />
                Sistemas operativos
              </span>
            </div>
          </MotionDiv>
        </MotionSection>
      </div>
    </main>
  )
}

export default AuthLayout
