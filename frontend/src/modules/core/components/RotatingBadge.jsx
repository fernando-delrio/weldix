import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const MotionDiv = motion.div

// Texto SVG que orbita alrededor de un círculo — efecto de badge rotante (estilo Apple/Vercel).
// `color` se controla con className (usa fill="currentColor").
// El `useId` evita conflicto de id si hay varios RotatingBadge en la misma página.
// prefers-reduced-motion: un giro infinito es justo el tipo de movimiento que
// esa preferencia pide evitar — se queda estático, el texto se sigue leyendo igual.
const RotatingBadge = ({
  text = '✦ GRATIS 15 DÍAS ✦ SIN TARJETA',
  size = 88,
  className = '',
  speed = 14,
}) => {
  const uid = useId().replace(/:/g, '')
  const pathId = `rb-${uid}`
  const prefersReducedMotion = useReducedMotion()

  return (
    <MotionDiv
      animate={prefersReducedMotion ? undefined : { rotate: 360 }}
      transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
      style={{ width: size, height: size }}
      className={className}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <path id={pathId} d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
        </defs>
        <text fontSize="9.2" fontWeight="700" letterSpacing="1.8" fill="currentColor">
          <textPath href={`#${pathId}`}>{text}</textPath>
        </text>
      </svg>
    </MotionDiv>
  )
}

export default RotatingBadge
