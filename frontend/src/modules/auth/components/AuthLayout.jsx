import { Link } from 'react-router-dom'

import { authTw, cx } from '../utils/tw'
import WordReveal from '../../core/components/WordReveal'
import { useTheme } from '../../core/lib/ThemeContext'

const VALUE_PROPS = [
  { icon: 'bx-tab', text: 'Funciona en la tablet del taller, sin instalar nada' },
  { icon: 'bx-time-five', text: 'Fichaje conforme al RDL 8/2019 desde el primer día' },
  { icon: 'bx-bot', text: 'Asistente con contexto real de tus trabajos y tu stock' },
]

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
        <section className={cx(authTw.heroSection, isDark ? 'bg-[#070b0f]' : 'bg-[#f1f5f9]')}>
          <div className={authTw.heroGlow} />

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
                calderería industrial.
              </p>

              <ul className={authTw.valueList}>
                {VALUE_PROPS.map((v) => (
                  <li key={v.icon} className={authTw.valueItem}>
                    <i className={`bx ${v.icon} ${authTw.valueIcon}`} aria-hidden="true" />
                    {v.text}
                  </li>
                ))}
              </ul>
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
            {(mode === 'login' || mode === 'register') && (
              <div className={authTw.modeSwitch}>
                <Link to="/login" className={modeButtonClass(mode, 'login')}>
                  Iniciar sesion
                </Link>
                <Link to="/registro" className={modeButtonClass(mode, 'register')}>
                  Registrar taller
                </Link>
              </div>
            )}

            <h1 className={authTw.panelTitle}>{title}</h1>
            <p className={authTw.panelSubtitle}>{subtitle}</p>

            {children}

            {feedbackMessage({ feedback, error })}
          </div>
        </section>
      </div>
    </main>
  )
}

export default AuthLayout
