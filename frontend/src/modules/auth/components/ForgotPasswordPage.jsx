import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { authTw } from '../utils/tw'
import WeldixButton from '../../core/components/WeldixButton'
import { authService } from '../services/authService'

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const isValidEmail = (v) => /\S+@\S+\.\S+/.test(v)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setError('Introduce un email válido')
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      await authService.forgotPassword({ email })
      setSent(true)
    } catch {
      // Nunca revelamos si el email existe — mostramos éxito igual
      setSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      mode="forgot"
      title="Recuperar contraseña"
      subtitle="Te enviamos un enlace por email"
    >
      {sent ? (
        <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/20 p-6 text-center">
          <i
            className="bx bx-envelope-open mb-3 block text-3xl text-emerald-400"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-emerald-300">
            Si ese email tiene una cuenta, recibirás un enlace en breve.
          </p>
          <p className="mt-2 text-xs text-slate-500">Revisa también la carpeta de spam.</p>
          <Link
            to="/login"
            className="mt-5 block text-sm font-semibold text-amber-400 hover:text-amber-300"
          >
            ← Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={authTw.formGrid} noValidate>
          <label htmlFor="reset-email" className={authTw.fieldLabel}>
            CORREO ELECTRÓNICO
          </label>
          <div className={authTw.fieldShell}>
            <i className={`bx bx-envelope ${authTw.fieldIcon}`} aria-hidden="true" />
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className={authTw.fieldInput}
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <WeldixButton
            type="submit"
            variant="warning"
            size="lg"
            isLoading={isLoading}
            loadingLabel="Enviando…"
            className="mt-1 w-full bg-amber-500 text-slate-950 hover:bg-amber-400"
          >
            Enviar enlace de recuperación
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

export default ForgotPasswordPage
