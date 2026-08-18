import { Link, useOutletContext } from 'react-router-dom'

import { cx } from '../../core/lib/cx'
import { useLandingAnimations } from '../hooks/useLandingAnimations'
import { CtaSection, TimelineSection } from './LandingPage'

const ComoFuncionaPage = () => {
  const { t } = useOutletContext()
  useLandingAnimations()

  return (
    <div className="pt-16">
      <TimelineSection t={t} />

      {/* Bloque demo / contacto */}
      <section
        className={cx(
          'border-y px-6 py-16 transition-colors duration-300',
          t.divider,
          t.sectionAlt
        )}
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className={cx('text-xs font-bold uppercase tracking-[0.2em]', t.accent)}>
            ¿Prefieres que te lo enseñemos?
          </p>
          <h2 className={cx('mt-3 font-display text-3xl font-extrabold sm:text-4xl', t.headline)}>
            Reserva una demo o pruébalo tú mismo
          </h2>
          <p className={cx('mx-auto mt-3 max-w-xl text-sm leading-relaxed', t.muted)}>
            Te enseñamos Weldix con tu caso concreto en 15 minutos, o entras y lo pruebas 15 días
            gratis sin tarjeta. Tú eliges.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="mailto:hola@weldix.es?subject=Quiero%20una%20demo%20de%20Weldix&body=Hola,%20me%20gustaría%20ver%20una%20demo%20de%20Weldix%20para%20mi%20taller."
              className={cx(
                'flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold tracking-wide shadow-lg transition',
                t.btnPrimary
              )}
            >
              <i className="bx bx-calendar-event text-base" />
              Reservar demo
            </a>
            <Link
              to="/registro"
              className={cx(
                'flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-medium tracking-wide transition',
                t.btnGhost
              )}
            >
              <i className="bx bx-rocket text-base" />
              Probar 15 días gratis
            </Link>
          </div>
        </div>
      </section>

      <CtaSection t={t} />
    </div>
  )
}

export default ComoFuncionaPage
