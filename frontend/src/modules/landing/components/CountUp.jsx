import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

// Cuenta de 0 a `end` con easing cúbico cuando el elemento entra en viewport.
// `format` permite localizar el número: n => n.toLocaleString('es-ES') → "1.125"
const CountUp = ({
  end,
  suffix = '',
  prefix = '',
  duration = 1.5,
  className,
  format = (n) => String(n),
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const [count, setCount] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const startTime = performance.now()

    const step = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * end))
      rafRef.current = progress < 1 ? requestAnimationFrame(step) : null
    }

    // Solo lanza el RAF cuando es visible; en caso contrario, no hace nada
    rafRef.current = isInView ? requestAnimationFrame(step) : null

    return () => rafRef.current && cancelAnimationFrame(rafRef.current)
  }, [isInView, end, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {format(count)}
      {suffix}
    </span>
  )
}

export default CountUp
