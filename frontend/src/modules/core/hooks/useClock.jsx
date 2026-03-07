import { useEffect, useState } from 'react'

function formatClock(value) {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value)
}

export function useClock(intervalMs = 30_000) {
  const [timeLabel, setTimeLabel] = useState(() => formatClock(new Date()))

  useEffect(() => {
    const tick = () => setTimeLabel(formatClock(new Date()))
    tick()
    const timerId = window.setInterval(tick, intervalMs)
    return () => window.clearInterval(timerId)
  }, [intervalMs])

  return timeLabel
}
