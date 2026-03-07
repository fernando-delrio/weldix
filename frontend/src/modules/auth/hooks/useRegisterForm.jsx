import { useState } from 'react'

import { authService } from '../services/authService'

export function useRegisterForm() {
  const [name, setName] = useState('')
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
      const data = await authService.signup({ email, password, full_name: name || null })
      setFeedback(`Cuenta creada: ${data.email}`)
      setName('')
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return { name, setName, email, setEmail, password, setPassword, feedback, error, isSubmitting, submit }
}
