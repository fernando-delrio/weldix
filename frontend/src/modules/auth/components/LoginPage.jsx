import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthSession } from '../hooks/useAuthSession'
import { API_BASE_URL } from '../../core/lib/api'
import AuthLayout from './AuthLayout'
import { authTw, cx } from '../utils/tw'

const LOGIN_ROLE_PRESETS = {
  operario: {
    label: 'OPERARIO',
    icon: 'OP',
    email: 'operario@weldix.dev',
    password: 'Password123',
  },
  admin: {
    label: 'JEFE / ADMIN',
    icon: 'AD',
    email: 'admin@weldix.dev',
    password: 'Admin1234!',
  },
}

function LoginPage() {
  const navigate = useNavigate()
  const { saveToken, refreshProfile } = useAuthSession()

  const [selectedLoginRole, setSelectedLoginRole] = useState('admin')
  const [email, setEmail] = useState(LOGIN_ROLE_PRESETS.admin.email)
  const [password, setPassword] = useState(LOGIN_ROLE_PRESETS.admin.password)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLoginRoleSelect = (roleKey) => {
    const preset = LOGIN_ROLE_PRESETS[roleKey]
    setSelectedLoginRole(roleKey)
    setEmail(preset.email)
    setPassword(preset.password)
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    setFeedback('')

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'No se pudo iniciar sesion')
      }

      saveToken(data.access_token)
      setFeedback('Acceso concedido. Validando usuario...')

      const me = await refreshProfile(data.access_token)
      if (me?.role) {
        setFeedback(`Sesion activa como ${me.role}`)
        navigate('/app/inicio', { replace: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      mode="login"
      title="Accede a tu espacio"
      subtitle="Introduce tus credenciales para continuar"
      feedback={feedback}
      error={error}
    >
      <form onSubmit={handleLoginSubmit} className={authTw.formGrid}>
        <label htmlFor="login-email" className={authTw.fieldLabel}>
          CORREO ELECTRONICO
        </label>
        <div className={authTw.fieldShell}>
          <span className={authTw.fieldIcon}>@</span>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="usuario@weldix.com"
            autoComplete="email"
            required
            className={authTw.fieldInput}
          />
        </div>

        <label htmlFor="login-password" className={authTw.fieldLabel}>
          CONTRASENA
        </label>
        <div className={authTw.fieldShell}>
          <span className={authTw.fieldIcon}>#</span>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="******"
            autoComplete="current-password"
            required
            className={authTw.fieldInput}
          />
        </div>

        <p className={authTw.helperTextRight}>Olvidaste tu contrasena?</p>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cx(authTw.primaryButton, authTw.primaryButtonWideTracking)}
        >
          {isSubmitting ? 'VALIDANDO...' : 'ENTRAR  ->'}
        </button>
      </form>

      <div className={authTw.roleDivider}>
        <span className={authTw.roleDividerText}>ACCESO RAPIDO POR ROL</span>
      </div>

      <div className={authTw.roleGrid}>
        {Object.entries(LOGIN_ROLE_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => handleLoginRoleSelect(key)}
            className={cx(
              authTw.roleButtonBase,
              selectedLoginRole === key ? authTw.roleButtonActive : authTw.roleButtonInactive,
            )}
          >
            <span className={authTw.roleIcon}>{preset.icon}</span>
            <span>{preset.label}</span>
          </button>
        ))}
      </div>
    </AuthLayout>
  )
}

export default LoginPage
