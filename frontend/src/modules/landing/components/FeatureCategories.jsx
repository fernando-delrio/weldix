import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'

import { cx } from '../../core/lib/cx'
import { SpotlightCard } from './SpotlightCard'

const MotionDiv = motion.div

// Mismo patrón reversible que Pain points y Cta final (whileInView sin
// once:true), pero sin spring: son ~15 tarjetas repartidas en 5 categorías,
// un rebote repetido tantas veces cansaría en vez de dar vida. Fade + subida
// corta y rápida, el gesto justo para que la lista larga no aparezca de golpe.
const featureGridVariants = {
  hidden: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
}

const featureCardVariants = {
  hidden: { opacity: 0, y: 16, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
}

const featureCardVariantsReduced = {
  hidden: { opacity: 0, transition: { duration: 0.12 } },
  visible: { opacity: 1, transition: { duration: 0.2 } },
}

// Funcionalidades agrupadas por categoría (estilo Jornada). Datos: doc/funcionalidades.md.
const CATEGORIES = [
  {
    title: 'Fichaje y acceso',
    cards: [
      {
        icon: 'bx bx-time-five',
        title: 'Control horario',
        desc: 'Ficha entrada y salida desde web, móvil o tablet. Cumple el RDL 8/2019 con exportación CSV para Inspección de Trabajo.',
      },
      {
        icon: 'bx bx-grid-alt',
        title: 'Modo kiosko',
        desc: 'Una tablet en la entrada del taller. Cada operario ficha con su PIN de 4 dígitos, sin iniciar sesión.',
      },
      {
        icon: 'bx bx-calculator',
        title: 'Horas y extras',
        desc: 'Cálculo automático de horas trabajadas, resumen de extras por operario y cierre forzado por el admin.',
      },
    ],
  },
  {
    title: 'Órdenes de trabajo',
    cards: [
      {
        icon: 'bx bx-list-check',
        title: 'OT digitales',
        desc: 'Código automático ORD-YYYY-NNN, flujo de 5 estados, historial de eventos y búsqueda global con Ctrl+K.',
      },
      {
        icon: 'bx bx-camera',
        title: 'Fotos por trabajo',
        desc: 'Galería por OT con etiquetas antes, durante y después, y visor a pantalla completa.',
      },
      {
        icon: 'bx bx-qr-scan',
        title: 'Escáner QR',
        desc: 'El operario abre e inicia la OT escaneando el código del papel con la cámara. Sin teclear nada.',
      },
      {
        icon: 'bx bx-link-alt',
        title: 'Portal cliente',
        desc: 'Un enlace público para que tu cliente siga el estado de su trabajo en tiempo real, sin crear cuenta.',
      },
    ],
  },
  {
    title: 'Almacén y compras',
    cards: [
      {
        icon: 'bx bx-package',
        title: 'Control de stock',
        desc: 'Existencias en tiempo real, alertas de mínimo y consumo de material imputado a cada OT.',
      },
      {
        icon: 'bx bx-receipt',
        title: 'Albarán con IA',
        desc: 'Sube la foto del albarán del proveedor y la IA extrae los materiales para incorporarlos al stock.',
      },
    ],
  },
  {
    title: 'Equipo y personas',
    cards: [
      {
        icon: 'bx bx-group',
        title: 'RRHH completo',
        desc: 'Vacaciones, ausencias, cuadrante de turnos, EPIs, certificados y reconocimientos médicos con alertas de caducidad.',
      },
      {
        icon: 'bxs bxs-file-pdf',
        title: 'Nóminas',
        desc: 'El admin sube el PDF de cada nómina y el operario descarga solo las suyas desde su perfil.',
      },
      {
        icon: 'bx bx-wrench',
        title: 'Mantenimiento (GMAO)',
        desc: 'Inventario de máquinas con estado y semáforo de mantenimiento: te avisa cuando una revisión vence.',
      },
    ],
  },
  {
    title: 'Inteligencia y control',
    cards: [
      {
        icon: 'bx bx-bot',
        title: 'Weldix AI',
        desc: 'Asistente técnico de soldadura (parámetros, defectos, normativa) que además responde con los datos reales de tu taller.',
      },
      {
        icon: 'bx bx-bar-chart-alt-2',
        title: 'Dashboard y métricas',
        desc: 'Panel del taller con gráficos por estado, operario y mes, y dashboard propio para cada operario.',
      },
      {
        icon: 'bx bx-bell',
        title: 'Avisos en tiempo real',
        desc: 'Campana con avisos en vivo: stock bajo, OT bloqueada más de 48 h o mantenimiento vencido.',
      },
    ],
  },
]

const FeatureCard = ({ card, t }) => (
  <SpotlightCard className={cx('rounded-2xl border p-6 transition-colors', t.card, t.cardHover)}>
    <div className={cx('mb-4 flex h-11 w-11 items-center justify-center rounded-xl', t.accentTint)}>
      <i className={cx(card.icon, 'text-2xl', t.accent)} aria-hidden="true" />
    </div>
    <h3 className={cx('text-base font-bold', t.headline)}>{card.title}</h3>
    <p className={cx('mt-2 flex-1 text-sm leading-relaxed', t.muted)}>{card.desc}</p>
    <Link
      to="/registro"
      className={cx(
        'mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 rounded-sm',
        t.accent
      )}
    >
      Prueba 15 días
      <i className="bx bx-right-arrow-alt text-base" aria-hidden="true" />
    </Link>
  </SpotlightCard>
)

const FeatureCategories = ({ t }) => {
  const prefersReducedMotion = useReducedMotion()
  const cardVariants = prefersReducedMotion ? featureCardVariantsReduced : featureCardVariants

  return (
    <div className="px-6 pb-24">
      <div className="mx-auto max-w-6xl space-y-16">
        {CATEGORIES.map((category) => (
          <section key={category.title}>
            <div className={cx('mb-6 border-b pb-3', t.divider)}>
              <h2 className={cx('font-display text-2xl font-extrabold', t.headline)}>
                {category.title}
              </h2>
            </div>
            <MotionDiv
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              variants={featureGridVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, amount: 0.15 }}
            >
              {category.cards.map((card) => (
                <MotionDiv key={card.title} variants={cardVariants}>
                  <FeatureCard card={card} t={t} />
                </MotionDiv>
              ))}
            </MotionDiv>
          </section>
        ))}
      </div>
    </div>
  )
}

export default FeatureCategories
