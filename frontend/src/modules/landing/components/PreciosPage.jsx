import { useOutletContext } from 'react-router-dom'

import { cx } from '../../core/lib/cx'
import { useLandingAnimations } from '../hooks/useLandingAnimations'
import { PricingSection } from './LandingPage'

// Comparativa honesta: hechos reales, no reseñas inventadas.
const COMPARATIVA = [
  { feature: 'Control horario y fichaje', fichaje: true, weldix: true },
  { feature: 'Modo kiosko con PIN', fichaje: true, weldix: true },
  { feature: 'RRHH, turnos y ausencias', fichaje: true, weldix: true },
  { feature: 'Nóminas', fichaje: true, weldix: true },
  { feature: 'Órdenes de trabajo (OT)', fichaje: false, weldix: true },
  { feature: 'Stock + lectura de albaranes con IA', fichaje: false, weldix: true },
  { feature: 'Mantenimiento de máquinas (GMAO)', fichaje: false, weldix: true },
  { feature: 'Portal para el cliente', fichaje: false, weldix: true },
  { feature: 'IA técnica de soldadura', fichaje: false, weldix: true },
  { feature: 'Fotos y QR por trabajo', fichaje: false, weldix: true },
]

const Cell = ({ on }) =>
  on ? (
    <i className="bx bx-check text-lg text-emerald-500" aria-label="Sí" />
  ) : (
    <i className="bx bx-x text-lg text-slate-500" aria-label="No" />
  )

const PreciosPage = () => {
  const { t } = useOutletContext()
  useLandingAnimations()

  return (
    <div className="pt-16">
      <PricingSection t={t} />

      {/* Por qué elegir Weldix */}
      <section className={cx('border-t px-6 py-24 transition-colors duration-300', t.divider)}>
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className={cx('text-xs font-bold uppercase tracking-[0.2em]', t.accent)}>
              Por qué elegir Weldix
            </p>
            <h2 className={cx('mt-3 font-display text-3xl font-extrabold sm:text-4xl', t.headline)}>
              Todo lo que hace un software de fichaje, y además tu taller entero
            </h2>
            <p className={cx('mx-auto mt-3 max-w-xl text-sm leading-relaxed', t.muted)}>
              Los SaaS de fichaje (Sesame, Jornada…) controlan horas y RRHH. Weldix también, pero
              está hecho para talleres de soldadura y calderería.
            </p>
          </div>

          <div className={cx('mt-10 overflow-hidden rounded-2xl border', t.card)}>
            <table className="w-full text-sm">
              <thead>
                <tr className={cx('border-b', t.divider)}>
                  <th
                    className={cx(
                      'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider',
                      t.muted
                    )}
                  >
                    Funcionalidad
                  </th>
                  <th
                    className={cx(
                      'px-3 py-3 text-center text-xs font-bold uppercase tracking-wider',
                      t.muted
                    )}
                  >
                    SaaS de fichaje
                  </th>
                  <th
                    className={cx(
                      'px-3 py-3 text-center text-xs font-black uppercase tracking-wider',
                      t.accent
                    )}
                  >
                    Weldix
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARATIVA.map((row) => (
                  <tr key={row.feature} className={cx('border-b last:border-0', t.divider)}>
                    <td className={cx('px-4 py-3', t.muted)}>{row.feature}</td>
                    <td className="px-3 py-3 text-center">
                      <Cell on={row.fichaje} />
                    </td>
                    <td className={cx('px-3 py-3 text-center', t.accentTint)}>
                      <Cell on={row.weldix} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PreciosPage
