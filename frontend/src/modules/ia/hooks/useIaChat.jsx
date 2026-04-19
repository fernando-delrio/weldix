import { useCallback, useRef, useState } from 'react'

import { consultarIA } from '../services/iaService'

// pageContext shape: { seccion: string, resumen: string, sugerencias: string[] }
export const useIaChat = (pageContext = null) => {
  const [messages, setMessages]   = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState('')
  const historialRef = useRef([]) // historial en formato {role, content} para la API

  const contextoSeccion = pageContext?.resumen ?? null

  const sendMessage = useCallback(async (texto) => {
    if (!texto.trim() || isLoading) return

    const userMsg = { role: 'user', content: texto.trim() }
    setMessages((prev) => [...prev, userMsg])
    historialRef.current = [...historialRef.current, userMsg]
    setIsLoading(true)
    setError('')

    try {
      const respuesta = await consultarIA(
        texto.trim(),
        historialRef.current.slice(0, -1),
        contextoSeccion,
      )
      const assistantMsg = { role: 'assistant', content: respuesta }
      setMessages((prev) => [...prev, assistantMsg])
      historialRef.current = [...historialRef.current, assistantMsg]
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, contextoSeccion])

  const clearChat = useCallback(() => {
    setMessages([])
    setError('')
    historialRef.current = []
  }, [])

  return { messages, isLoading, error, sendMessage, clearChat }
}
