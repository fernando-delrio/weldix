import { useState } from 'react'
import { motion } from 'framer-motion'

import { useAuthSession } from '../../auth/useAuthSession'
import { API_BASE_URL } from '../../shared/api'
import AuthLayout from './AuthLayout'
import { authTw, cx } from './tw'

const REGISTER_ROLE_OPTIONS = {
  operario: {
    label: 'OPERARIO',
    helper: 'Registro publico',
  },
  admin: {
    label: 'JEFE / ADMIN',
    helper: 'Solo admin autenticado',
  },
}

const MotionButton = motion.button

function RegisterPage() {
  const { token, profile, isFetchingProfile, clearSession } = useAuthSession()

  const [registerRole, setRegisterRole] = useState('operario')
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
      const payload = {
        email,
        password,
        full_name: name || null,
      }

      const headers = { 'Content-Type': 'application/json' }
      let endpoint = `${API_BASE_URL}/auth/signup`

      if (registerRole === 'admin') {
        if (!token || profile?.role !== 'admin') {
          throw new Error('Para registrar Jefe/Admin debes iniciar sesion como admin.')
        }
        endpoint = `${API_BASE_URL}/auth/admin/signup`
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'No se pudo registrar el usuario')
      }

      setFeedback(`Usuario creado: ${data.email} (${data.role})`)
      setName('')
      setEmail('')
      setPassword('')
      setRegisterRole('operario')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      mode="register"
      title="Registrar usuario"
      subtitle="Diferencia entre Operario y Jefe/Admin con seguridad en backend"
      feedback={feedback}
      error={error}
      token={token}
      profile={profile}
      isFetchingProfile={isFetchingProfile}
      onLogout={clearSession}
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

        <div className={authTw.roleGrid}>
          {Object.entries(REGISTER_ROLE_OPTIONS).map(([key, option]) => (
            <button
              key={key}
              type="button"
              onClick={() => setRegisterRole(key)}
              className={cx(
                authTw.registerRoleCardBase,
                registerRole === key ? authTw.registerRoleCardActive : authTw.registerRoleCardInactive,
              )}
            >
              <p className={authTw.registerRoleTitle}>{option.label}</p>
              <p className={authTw.registerRoleHelper}>{option.helper}</p>
            </button>
          ))}
        </div>

        {registerRole === 'admin' && (
          <p className={authTw.registerWarning}>
            Para crear un Jefe/Admin debes estar autenticado como admin. La API bloquea este registro para
            cualquier otro usuario.
          </p>
        )}

        <MotionButton
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={isSubmitting}
          className={cx(authTw.primaryButton, authTw.primaryButtonMediumTracking)}
        >
          {isSubmitting ? 'CREANDO...' : 'REGISTRAR'}
        </MotionButton>
      </form>
    </AuthLayout>
  )
}

export default RegisterPage
