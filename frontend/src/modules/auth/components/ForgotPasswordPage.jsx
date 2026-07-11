import { useState } from 'react'
import { Link } from 'react-router-dom'
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
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <p className="text-2xl font-extrabold tracking-[0.18em] text-slate-100">WELDIX</p>
          <h1 className="mt-3 text-lg font-semibold text-slate-300">Recuperar contraseña</h1>
        </div>

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
              className="mt-5 block text-sm font-semibold text-sky-400 hover:text-sky-300"
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="reset-email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-xl bg-sky-600 text-sm font-bold tracking-wide text-white transition hover:bg-sky-500 disabled:opacity-60"
            >
              {isLoading ? 'Enviando…' : 'Enviar enlace de recuperación'}
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

export default ForgotPasswordPage
