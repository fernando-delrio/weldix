import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthSession } from '../../auth/hooks/useAuthSession'

const WS_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/^http/, 'ws')
const HEARTBEAT_MS = 30_000
const RECONNECT_MS = 4_000

const useNotifications = () => {
  const { token } = useAuthSession()
  const [alerts, setAlerts] = useState([])
  const [unread, setUnread] = useState(0)
  const wsRef = useRef(null)
  const heartbeatRef = useRef(null)
  const reconnectRef = useRef(null)

  useEffect(() => {
    if (!token) return

    // connect se define dentro del efecto para evitar dependencia circular en useCallback
    const connect = () => {
      const ws = new WebSocket(`${WS_BASE}/ws/notificaciones?token=${token}`)

      ws.onopen = () => {
        clearTimeout(reconnectRef.current)
        heartbeatRef.current = setInterval(
          () => ws.readyState === WebSocket.OPEN && ws.send('ping'),
          HEARTBEAT_MS
        )
      }

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data)
        data.type === 'snapshot' && setAlerts(data.alerts)
        data.type === 'snapshot' && setUnread((prev) => Math.max(prev, data.alerts.length))
      }

      ws.onclose = () => {
        clearInterval(heartbeatRef.current)
        reconnectRef.current = setTimeout(connect, RECONNECT_MS)
      }

      wsRef.current = ws
    }

    connect()

    return () => {
      clearInterval(heartbeatRef.current)
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [token])

  const markAllRead = useCallback(() => setUnread(0), [])

  return { alerts, unread, markAllRead }
}

export default useNotifications
