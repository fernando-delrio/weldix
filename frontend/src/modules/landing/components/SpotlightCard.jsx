import { useRef } from 'react'

import { cx } from '../../core/lib/cx'

// Card con "spotlight": un foco radial que sigue al ratón y aparece solo en hover.
// Estilo Aceternity, sin dependencias: usamos un ref + variables CSS (--mx/--my)
// y las escribimos con style.setProperty → CERO re-render de React por movimiento.
// spotColor por defecto en ámbar — es el único acento de marca del landing;
// un azul aquí sería el único elemento fuera de paleta de toda la página.
export const SpotlightCard = ({ children, className, spotColor = 'rgba(245,158,11,0.14)' }) => {
  const ref = useRef(null)

  const handleMouseMove = (event) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    el.style.setProperty('--my', `${event.clientY - rect.top}px`)
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={cx('group relative overflow-hidden', className)}
    >
      {/* Foco que sigue al ratón — invisible salvo en hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), ${spotColor}, transparent 65%)`,
        }}
      />
      {/* Contenido por encima del foco */}
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </div>
  )
}

export default SpotlightCard
