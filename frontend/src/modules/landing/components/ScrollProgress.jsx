import { useScroll, useSpring, motion } from 'framer-motion'

// Alias en JS puro → ESLint detecta el uso de motion fuera de JSX
const MotionDiv = motion.div

// Barra de progreso de scroll — fijada al top, por encima del navbar.
// useSpring suaviza el salto de scrollYProgress para que no sea mecánico.
const ScrollProgress = () => {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 400, damping: 40, restDelta: 0.001 })

  return (
    <MotionDiv
      style={{ scaleX, transformOrigin: '0%' }}
      className="pointer-events-none fixed left-0 right-0 top-0 z-[10001] h-[2px] bg-amber-500"
    />
  )
}

export default ScrollProgress
