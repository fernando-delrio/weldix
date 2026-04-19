import { useEffect, useState } from 'react'

const formatClock = (value) => {
  const fecha = new Intl.DateTimeFormat('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
  }).format(value)
  const hora = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(value)
  // "mié, 1 abr · 08:49"
  return `${fecha} · ${hora}`
}

export const useClock = (intervalMs = 30_000) => {
  const [timeLabel, setTimeLabel] = useState(() => formatClock(new Date()))

  useEffect(() => {
    const tick = () => setTimeLabel(formatClock(new Date()))
    tick()
    const timerId = window.setInterval(tick, intervalMs)
    return () => window.clearInterval(timerId)
  }, [intervalMs])

  return timeLabel
}
