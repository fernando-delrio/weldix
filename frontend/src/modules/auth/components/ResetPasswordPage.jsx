import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
        className="mt-4 block text-sm font-semibold text-sky-400 hover:text-sky-300"
      >
        Recuperar contraseña
      </Link>
    </div>
  )

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <p className="text-2xl font-extrabold tracking-[0.18em] text-slate-100">WELDIX</p>
          <h1 className="mt-3 text-lg font-semibold text-slate-300">Nueva contraseña</h1>
        </div>

        {noToken || (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                Nueva contraseña
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                Confirmar contraseña
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-xl bg-sky-600 text-sm font-bold tracking-wide text-white transition hover:bg-sky-500 disabled:opacity-60"
            >
              {isLoading ? 'Guardando…' : 'Guardar nueva contraseña'}
            </button>

            <Link
              to="/login"
              className="block text-center text-sm text-slate-500 hover:text-slate-300"
            >
              ← Volver al inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </main>
  )
}

export default ResetPasswordPage
