import { useState } from 'react'

import { API_BASE_URL } from '../../core/lib/api'
import AuthLayout from './AuthLayout'
import { authTw, cx } from '../utils/tw'

function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    setFeedback('')

    try {
      const payload = { email, password, full_name: name || null }

      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'No se pudo registrar el usuario')
      }

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

  return (
    <AuthLayout
      mode="register"
      title="Crear cuenta"
      subtitle="Registro de operario. Los administradores son creados por el jefe de taller."
      feedback={feedback}
      error={error}
    >
      <form onSubmit={handleSubmit} className={authTw.formGrid}>
        <label htmlFor="register-name" className={authTw.fieldLabel}>
          NOMBRE
        </label>
        <div className={authTw.fieldShell}>
          <span className={authTw.fieldIcon}>N</span>
          <input
            id="register-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre completo (opcional)"
            autoComplete="name"
            className={authTw.fieldInput}
          />
        </div>

        <label htmlFor="register-email" className={authTw.fieldLabel}>
          CORREO ELECTRONICO
        </label>
        <div className={authTw.fieldShell}>
          <span className={authTw.fieldIcon}>@</span>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nuevo@weldix.com"
            autoComplete="email"
            required
            className={authTw.fieldInput}
          />
        </div>

        <label htmlFor="register-password" className={authTw.fieldLabel}>
          CONTRASENA
        </label>
        <div className={authTw.fieldShell}>
          <span className={authTw.fieldIcon}>#</span>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimo 8 caracteres"
            autoComplete="new-password"
            minLength={8}
            required
            className={authTw.fieldInput}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cx(authTw.primaryButton, authTw.primaryButtonMediumTracking)}
        >
          {isSubmitting ? 'CREANDO...' : 'REGISTRAR'}
        </button>
      </form>
    </AuthLayout>
  )
}

export default RegisterPage
