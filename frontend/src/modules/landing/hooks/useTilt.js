import { useCallback, useRef } from 'react'

// Efecto 3D tilt en hover — sin RAF, sin state, solo transforms inline.
// `maxDeg` controla la inclinación máxima en grados.
// clearProps:'all' de GSAP se ejecuta antes de que el usuario pueda hacer hover
// (la animación de entrada ya habrá terminado), por lo que no hay conflicto.
const useTilt = (maxDeg = 6) => {
  const ref = useRef(null)

  const onMouseMove = useCallback(
    (e) => {
      const el = ref.current
      const rect = el?.getBoundingClientRect()
      rect &&
        Object.assign(el.style, {
          transform: `perspective(700px) rotateX(${((e.clientY - (rect.top + rect.height / 2)) / rect.height) * maxDeg * -2}deg) rotateY(${((e.clientX - (rect.left + rect.width / 2)) / rect.width) * maxDeg * 2}deg) translateZ(6px)`,
          transition: 'transform 0.05s ease-out',
        })
    },
    [maxDeg]
  )

  const onMouseLeave = useCallback(() => {
    ref.current &&
      Object.assign(ref.current.style, {
        transform: 'perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(0)',
        transition: 'transform 0.4s ease-out',
      })
  }, [])

  return { ref, onMouseMove, onMouseLeave }
}

export default useTilt
