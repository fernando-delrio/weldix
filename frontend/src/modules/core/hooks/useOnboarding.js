import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../lib/api'

// Llama al backend para marcar el onboarding como completado
const markDone = () =>
  fetch(`${API_BASE_URL}/auth/me/onboarding-done`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('weldix_access_token')}` },
  })

const useOnboarding = (profile) => {
  // Mostramos el wizard si el perfil ya cargó y onboarding_done es false
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (profile && profile.onboarding_done === false) {
      setShow(true)
    }
  }, [profile])

  const complete = () => {
    setShow(false)
    markDone().catch(() => {/* silencioso — no crítico */})
  }

  return { show, complete }
}

export default useOnboarding
