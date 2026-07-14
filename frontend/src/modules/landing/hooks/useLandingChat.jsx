import { useCallback, useState } from 'react'

import { sendLandingChat } from '../services/landingChatService'

export const CONTACT_EMAIL = 'hola@weldix.app'
const ESCALATE_AFTER = 4 // tras 4 preguntas, sugerimos hablar con una persona

export const SUGGESTED = [
  '¿Cuánto cuesta?',
  '¿Puedo probarlo gratis?',
  '¿Sirve para mi taller de soldadura?',
  '¿Cumple el registro horario legal?',
]

// Hook del chat de venta. try/catch vive aquí (regla del proyecto); el componente solo pinta.
export const useLandingChat = () => {
  const [messages, setMessages] = useState([]) // { role: 'user' | 'assistant', content }
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)

  const userCount = messages.filter((m) => m.role === 'user').length
  const showContact = userCount >= ESCALATE_AFTER

  const send = useCallback(
    async (text) => {
      const mensaje = (text ?? '').trim()
      if (!mensaje || isSending) return

      setError(null)
      const historial = messages.map((m) => ({ role: m.role, content: m.content }))
      setMessages((prev) => [...prev, { role: 'user', content: mensaje }])
      setIsSending(true)
      try {
        const respuesta = await sendLandingChat(mensaje, historial)
        setMessages((prev) => [...prev, { role: 'assistant', content: respuesta }])
      } catch (err) {
        setError(err.message)
      } finally {
        setIsSending(false)
      }
    },
    [messages, isSending]
  )

  return { messages, isSending, error, showContact, send }
}
