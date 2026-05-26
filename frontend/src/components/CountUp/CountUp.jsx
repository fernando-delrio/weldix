import { useInView, useMotionValue, useSpring } from 'framer-motion'
import { useCallback, useEffect, useRef } from 'react'

// ── Helpers de formato decimal ────────────────────────────────────────────────
// Decompose Conditional: cada condición tiene su propio nombre
const extractDecimalStr = (str) => str.split('.')[1]
const hasSignificantDecimal = (str) => str.includes('.') && parseInt(extractDecimalStr(str)) !== 0

const getDecimalPlaces = (num) => {
  const str = num.toString()
  return hasSignificantDecimal(str) ? extractDecimalStr(str).length : 0
}

// ── Guards nombrados ──────────────────────────────────────────────────────────
const callIfFunction = (fn) => typeof fn === 'function' && fn()
const updateDisplay = (ref, text) => ref.current && (ref.current.textContent = text)

// ── Componente ────────────────────────────────────────────────────────────────
const CountUp = ({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  startWhen = true,
  separator = '',
  onStart,
  onEnd,
}) => {
  const ref = useRef(null)
  const motionValue = useMotionValue(direction === 'down' ? to : from)
  const springValue = useSpring(motionValue, {
    damping: 20 + 40 * (1 / duration),
    stiffness: 100 * (1 / duration),
  })
  const isInView = useInView(ref, { once: true, margin: '0px' })

  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to))

  const formatValue = useCallback(
    (latest) => {
      const hasDecimals = maxDecimals > 0
      const options = {
        useGrouping: !!separator,
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0,
      }
      const formatted = Intl.NumberFormat('en-US', options).format(latest)
      return separator ? formatted.replace(/,/g, separator) : formatted
    },
    [maxDecimals, separator]
  )

  // Inicializa el texto visible con el valor de partida
  useEffect(() => {
    updateDisplay(ref, formatValue(direction === 'down' ? to : from))
  }, [from, to, direction, formatValue])

  // Dispara la animación cuando el elemento entra en pantalla
  useEffect(() => {
    if (!isInView || !startWhen) return // guard clause — sale si todavía no toca animar
    callIfFunction(onStart)
    const timeoutId = setTimeout(() => {
      motionValue.set(direction === 'down' ? from : to)
    }, delay * 1000)
    const durationTimeoutId = setTimeout(
      () => {
        callIfFunction(onEnd)
      },
      delay * 1000 + duration * 1000
    )
    return () => {
      clearTimeout(timeoutId)
      clearTimeout(durationTimeoutId)
    }
  }, [isInView, startWhen, motionValue, direction, from, to, delay, onStart, onEnd, duration])

  // Actualiza el DOM en cada frame del spring
  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) =>
      updateDisplay(ref, formatValue(latest))
    )
    return () => unsubscribe()
  }, [springValue, formatValue])

  return <span className={className} ref={ref} />
}

export default CountUp
