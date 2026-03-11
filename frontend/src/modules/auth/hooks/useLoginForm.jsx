import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthSession } from './useAuthSession'
import { authService } from '../services/authService'

const navigateToAppIfAuthenticated = (me, navigate) => {
  me?.role && navigate('/app/inicio', { replace: true })
}

export const useLoginForm = () => {
  const navigate = useNavigate()
  const { saveToken, refreshProfile } = useAuthSession()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    setFeedback('')

    try {
      const data = await authService.login({ email, password })
      saveToken(data.access_token)
      setFeedback('Acceso concedido. Validando usuario...')
      const me = await refreshProfile(data.access_token)
      navigateToAppIfAuthenticated(me, navigate)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return { email, setEmail, password, setPassword, feedback, error, isSubmitting, submit }
}
