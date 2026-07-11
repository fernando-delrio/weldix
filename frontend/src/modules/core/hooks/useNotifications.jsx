import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthSession } from '../../auth/hooks/useAuthSession'

const WS_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/^http/, 'ws')
const HEARTBEAT_MS = 30_000
const RECONNECT_MS = 4_000

const useNotifications = () => {
  const { token } = useAuthSession()
  const [alerts, setAlerts] = useState([])
  // IDs de alertas que el usuario ya vio — se actualizan en markAllRead
  // unread se deriva de alerts - seenIds, sin useState extra
  const [seenIds, setSeenIds] = useState(() => new Set())
  const wsRef = useRef(null)
  const heartbeatRef = useRef(null)
  const reconnectRef = useRef(null)

  useEffect(() => {
    if (!token) return

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
        try {
          const data = JSON.parse(e.data)
          if (data.type === 'snapshot') setAlerts(data.alerts ?? [])
        } catch {
          // ignorar mensajes malformados
        }
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

  // Marca como leídas las alertas actualmente visibles
  const markAllRead = useCallback(
    () => setSeenIds((prev) => new Set([...prev, ...alerts.map((a) => a.id)])),
    [alerts]
  )

  // Estado derivado — no en useState para evitar bug de sincronización
  const unread = alerts.filter((a) => !seenIds.has(a.id)).length

  return { alerts, unread, markAllRead }
}

export default useNotifications
