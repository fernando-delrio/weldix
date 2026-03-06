import { useState } from 'react'

import AuthLayout from './AuthLayout'
import { authTw, cx } from '../utils/tw'
import { useLoginForm } from '../hooks/useLoginForm'

const DEV_PRESETS = import.meta.env.DEV
  ? {
      operario: { label: 'OPERARIO', icon: 'OP', email: 'operario@weldix.dev', password: 'Password123' },
      admin: { label: 'JEFE / ADMIN', icon: 'AD', email: 'admin@weldix.dev', password: 'Admin1234!' },
    }
  : null

const roleButtonClass = ({ selectedRole, key }) =>
  cx(authTw.roleButtonBase, selectedRole === key ? authTw.roleButtonActive : authTw.roleButtonInactive)

const devPresets = ({ selectedRole, onPreset }) =>
  DEV_PRESETS && (
    <>
      <div className={authTw.roleDivider}>
        <span className={authTw.roleDividerText}>ACCESO RAPIDO POR ROL</span>
      </div>
      <div className={authTw.roleGrid}>
        {Object.entries(DEV_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => onPreset(key)}
            className={roleButtonClass({ selectedRole, key })}
          >
            <span className={authTw.roleIcon}>{preset.icon}</span>
            <span>{preset.label}</span>
          </button>
        ))}
      </div>
    </>
  )

function LoginPage() {
  const { email, setEmail, password, setPassword, feedback, error, isSubmitting, fillPreset, submit } =
    useLoginForm()

  const [selectedRole, setSelectedRole] = useState('admin')

  const handlePreset = (key) => {
    setSelectedRole(key)
    fillPreset(DEV_PRESETS[key])
  }

  return (
    <AuthLayout
      mode="login"
      title="Accede a tu espacio"
      subtitle="Introduce tus credenciales para continuar"
      feedback={feedback}
      error={error}
    >
      <form onSubmit={submit} className={authTw.formGrid}>
        <label htmlFor="login-email" className={authTw.fieldLabel}>
          CORREO ELECTRONICO
        </label>
        <div className={authTw.fieldShell}>
          <span className={authTw.fieldIcon}>@</span>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
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

      {devPresets({ selectedRole, onPreset: handlePreset })}
    </AuthLayout>
  )
}

export default LoginPage
