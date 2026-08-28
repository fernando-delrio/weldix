import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { authTw } from '../utils/tw'
import WeldixButton from '../../core/components/WeldixButton'
import { authService } from '../services/authService'

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const validationError = () => {
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
    if (password !== confirm) return 'Las contraseñas no coinciden'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validationError()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      await authService.resetPassword({ token, new_password: password })
      navigate('/login?reset=ok')
    } catch (err) {
      setError(err.message ?? 'El enlace no es válido o ha expirado')
    } finally {
      setIsLoading(false)
    }
  }

  const noToken = !token && (
    <div className="rounded-xl border border-rose-700/40 bg-rose-900/20 p-6 text-center">
      <p className="text-sm font-semibold text-rose-300">Enlace no válido. Solicita uno nuevo.</p>
      <Link
        to="/forgot-password"
        className="mt-4 block text-sm font-semibold text-amber-400 hover:text-amber-300"
      >
        Recuperar contraseña
      </Link>
    </div>
  )

  return (
    <AuthLayout mode="reset" title="Nueva contraseña" subtitle="Elige una contraseña que recuerdes">
      {noToken || (
        <form onSubmit={handleSubmit} className={authTw.formGrid} noValidate>
          <label htmlFor="new-password" className={authTw.fieldLabel}>
            NUEVA CONTRASEÑA
          </label>
          <div className={authTw.fieldShell}>
            <i className={`bx bx-lock-alt ${authTw.fieldIcon}`} aria-hidden="true" />
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className={authTw.fieldInput}
            />
          </div>

          <label htmlFor="confirm-password" className={authTw.fieldLabel}>
            CONFIRMAR CONTRASEÑA
          </label>
          <div className={authTw.fieldShell}>
            <i className={`bx bx-lock-alt ${authTw.fieldIcon}`} aria-hidden="true" />
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              className={authTw.fieldInput}
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <WeldixButton
            type="submit"
            variant="warning"
            size="lg"
            isLoading={isLoading}
            loadingLabel="Guardando…"
            className="mt-1 w-full bg-amber-500 text-slate-950 hover:bg-amber-400"
          >
            Guardar nueva contraseña
          </WeldixButton>

          <Link
            to="/login"
            className="mt-1 block text-center text-sm text-slate-500 hover:text-slate-300"
          >
            ← Volver al inicio de sesión
          </Link>
        </form>
      )}
    </AuthLayout>
  )
}

export default ResetPasswordPage
