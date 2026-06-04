import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cx } from '../../core/lib/cx'

const MotionDiv = motion.div

const PROOFS = [
  { name: 'Carlos F.', action: 'acaba de crear su taller', time: 'hace 2 min' },
  { name: 'Miguel A.', action: 'creó su primera OT', time: 'hace 4 min' },
  { name: 'Talleres CF', action: 'lleva 3 semanas sin papel', time: 'hoy' },
  { name: 'Juan P.', action: 'registró el primer fichaje', time: 'hace 7 min' },
  { name: 'Metálicas JB', action: 'importó su primer albarán', time: 'hace 12 min' },
]

// Toasts de prueba social — aparecen cada ~15-25s, se van solos a los 4.5s.
// Flujo: setTimeout inicial (5s) → show → setTimeout hide (4.5s) → setTimeout show again (~18s)
const SocialProofToast = ({ isDark }) => {
  const [current, setCurrent] = useState(null)
  const [key, setKey] = useState(0)
  const timerRef = useRef(null)
  const indexRef = useRef(0)

  const cardClass = isDark
    ? 'bg-[#0d1520] border border-slate-800 text-slate-100 shadow-xl shadow-black/40'
    : 'bg-white border border-[#e2e8f0] text-[#0f172a] shadow-xl shadow-black/8'

  useEffect(() => {
    const show = () => {
      const proof = PROOFS[indexRef.current % PROOFS.length]
      indexRef.current += 1
      setCurrent(proof)
      setKey((k) => k + 1)

      timerRef.current = setTimeout(() => {
        setCurrent(null)
        timerRef.current = setTimeout(show, 14000 + Math.random() * 8000)
      }, 4500)
    }

    timerRef.current = setTimeout(show, 5000)
    return () => clearTimeout(timerRef.current)
  }, [])

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-[9500]">
      <AnimatePresence mode="wait">
        {current && (
          <MotionDiv
            key={key}
            initial={{ x: -72, opacity: 0, scale: 0.94 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -60, opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', damping: 22, stiffness: 220 }}
            className={cx('flex max-w-[280px] items-start gap-3 rounded-xl p-3.5', cardClass)}
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[0.6rem] font-black text-amber-500">
              {current.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-[0.72rem] font-bold">{current.name}</p>
              <p
                className={cx(
                  'text-[0.65rem] leading-snug',
                  isDark ? 'text-slate-400' : 'text-[#64748b]'
                )}
              >
                {current.action}
              </p>
              <p className="mt-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-amber-500">
                {current.time}
              </p>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SocialProofToast
