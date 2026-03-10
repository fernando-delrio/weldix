import { useCallback, useRef, useState } from 'react'

import { consultarIA } from '../services/iaService'

export const useIaChat = (jobContext = null) => {
  const [messages, setMessages]     = useState([])
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState('')
  const historialRef = useRef([])   // historial en formato {role, content} para la API

  const sendMessage = useCallback(async (texto) => {
    if (!texto.trim() || isLoading) return

    const userMsg = { role: 'user', content: texto.trim() }
    setMessages((prev) => [...prev, userMsg])
    historialRef.current = [...historialRef.current, userMsg]
    setIsLoading(true)
    setError('')

    try {
      const respuesta = await consultarIA(texto.trim(), historialRef.current.slice(0, -1), jobContext)
      const assistantMsg = { role: 'assistant', content: respuesta }
      setMessages((prev) => [...prev, assistantMsg])
      historialRef.current = [...historialRef.current, assistantMsg]
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, jobContext])

  const clearChat = useCallback(() => {
    setMessages([])
    setError('')
    historialRef.current = []
  }, [])

  return { messages, isLoading, error, sendMessage, clearChat }
}
