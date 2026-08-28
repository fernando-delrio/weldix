import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import { cx } from '../../core/lib/cx'

const FAQS = [
  {
    q: '¿Cuánto cuesta?',
    a: '49 €/mes de base + 17 € por operario, sin permanencia. Puedes empezar con 15 días gratis y sin tarjeta.',
  },
  {
    q: '¿Puedo probarlo antes de pagar?',
    a: 'Sí. 15 días completos con acceso a todo y sin meter tarjeta. Al registrarte ya estás dentro.',
  },
  {
    q: '¿Necesito instalar algo?',
    a: 'No. Funciona en el navegador y en tablet o móvil se instala como app (PWA), sin App Store. Aguanta cortes de conexión.',
  },
  {
    q: '¿Sirve para mi taller de soldadura o calderería?',
    a: 'Está hecho justo para eso: soldadura, calderería y metal. No es un software genérico adaptado.',
  },
  {
    q: '¿Qué diferencia hay con un software de fichaje (Sesame, Jornada…)?',
    a: 'Esos hacen fichaje y RRHH. Weldix hace eso y además gestiona el taller entero: órdenes de trabajo, stock, portal para el cliente y una IA que entiende de soldadura.',
  },
  {
    q: '¿Cumple la ley de registro horario (RDL 8/2019)?',
    a: 'Sí. Registro de jornada y exportación en CSV lista para Inspección de Trabajo.',
  },
  {
    q: '¿Cómo fichan los operarios?',
    a: 'Como quieras: web, móvil, tablet, o modo kiosko — una tablet en la entrada donde cada uno ficha con su PIN. Sea cual sea, es la misma jornada.',
  },
  {
    q: '¿Mis datos están separados de los de otros talleres?',
    a: 'Totalmente. Cada taller es un espacio aislado: nadie de fuera ve tus trabajos, tu gente ni tu stock. Cumple RGPD.',
  },
  {
    q: '¿Mis clientes pueden ver cómo va su trabajo?',
    a: 'Sí. Les mandas un enlace y siguen el estado de su OT en tiempo real, sin crear cuenta.',
  },
  {
    q: '¿Puedo cancelar cuando quiera?',
    a: 'Sí, sin permanencia ni penalización. Tus datos quedan guardados por si vuelves.',
  },
]

const FaqItem = ({ item, isOpen, onToggle, t }) => (
  <div className={cx('overflow-hidden rounded-xl border', t.card)}>
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
    >
      <span className={cx('text-sm font-bold', t.headline)}>{item.q}</span>
      <i
        className={cx(
          'bx bx-chevron-down shrink-0 text-xl transition-transform',
          t.accent,
          isOpen && 'rotate-180'
        )}
        aria-hidden="true"
      />
    </button>
    {isOpen && <p className={cx('px-5 pb-5 text-sm leading-relaxed', t.muted)}>{item.a}</p>}
  </div>
)

const FaqsPage = () => {
  const { t } = useOutletContext()
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section className="px-6 pb-24 pt-28">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className={cx('text-xs font-bold uppercase tracking-[0.2em]', t.accent)}>
            Preguntas frecuentes
          </p>
          <h1 className={cx('mt-3 font-display text-4xl font-extrabold sm:text-5xl', t.headline)}>
            Todo lo que quieres saber
          </h1>
          <p className={cx('mx-auto mt-3 max-w-xl text-base', t.muted)}>
            ¿No ves tu duda? Pregúntale al chat de abajo o escríbenos a{' '}
            <a href="mailto:hola@weldix.es" className={cx('font-bold underline', t.accent)}>
              hola@weldix.es
            </a>
            .
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {FAQS.map((item, index) => (
            <FaqItem
              key={item.q}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
              t={t}
            />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/registro"
            className={cx(
              'inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold tracking-wide shadow-lg transition',
              t.btnPrimary
            )}
          >
            <i className="bx bx-rocket" />
            Probar 15 días gratis
          </Link>
        </div>
      </div>
    </section>
  )
}

export default FaqsPage
