import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

const MotionDiv = motion.div

// El elemento sigue al cursor con un efecto magnético suave.
// strength controla cuántos px se desplaza respecto al centro.
// Solo efecto real en desktop — en móvil no hay hover, el spring vuelve a 0.
const MagneticWrap = ({ children, strength = 0.25, className }) => {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 250, damping: 18 })
  const springY = useSpring(y, { stiffness: 250, damping: 18 })

  const handleMouseMove = (e) => {
    const rect = ref.current?.getBoundingClientRect()
    rect && x.set((e.clientX - (rect.left + rect.width / 2)) * strength)
    rect && y.set((e.clientY - (rect.top + rect.height / 2)) * strength)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <MotionDiv
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </MotionDiv>
  )
}

export default MagneticWrap
