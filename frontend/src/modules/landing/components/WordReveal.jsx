import { motion } from 'framer-motion'

const MotionSpan = motion.span

// Cada palabra sube desde abajo con clip (overflow hidden en el wrapper).
// `delay` en segundos — permite escalonar líneas de un h1 entre sí.
const wordVariant = {
  hidden: { y: '110%', opacity: 0 },
  visible: (i) => ({
    y: 0,
    opacity: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
}

const WordReveal = ({ text, className, initialDelay = 0 }) => {
  const words = text.split(' ')

  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom' }}
        >
          <MotionSpan
            custom={i + initialDelay / 0.08}
            variants={wordVariant}
            initial="hidden"
            animate="visible"
            style={{ display: 'inline-block' }}
          >
            {word}
          </MotionSpan>
          {i < words.length - 1 && <>&nbsp;</>}
        </span>
      ))}
    </span>
  )
}

export default WordReveal
