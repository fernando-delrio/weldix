import { Link, useSearchParams } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { authTw } from '../utils/tw'
import WeldixButton from '../../core/components/WeldixButton'
import { useLoginForm } from '../hooks/useLoginForm'

const LoginPage = () => {
  const { email, setEmail, password, setPassword, feedback, error, isSubmitting, submit } =
    useLoginForm()
  const [searchParams] = useSearchParams()
  const resetOk = searchParams.get('reset') === 'ok'

  return (
    <AuthLayout
      mode="login"
      title="Accede a tu espacio"
      subtitle="Introduce tus credenciales para continuar"
      feedback={feedback}
      error={error}
    >
      {resetOk && (
        <p className="rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-4 py-3 text-center text-sm font-semibold text-emerald-300">
          Contraseña actualizada. Ya puedes iniciar sesión.
        </p>
      )}
      <form onSubmit={submit} className={authTw.formGrid}>
        <label htmlFor="login-email" className={authTw.fieldLabel}>
          CORREO ELECTRÓNICO
        </label>
        <div className={authTw.fieldShell}>
          <i className={`bx bx-envelope ${authTw.fieldIcon}`} aria-hidden="true" />
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
          CONTRASEÑA
        </label>
        <div className={authTw.fieldShell}>
          <i className={`bx bx-lock-alt ${authTw.fieldIcon}`} aria-hidden="true" />
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            autoComplete="current-password"
            required
            className={authTw.fieldInput}
          />
        </div>

        <Link to="/forgot-password" className={authTw.helperTextRight}>
          ¿Olvidaste tu contraseña?
        </Link>

        <WeldixButton
          type="submit"
          variant="warning"
          size="lg"
          isLoading={isSubmitting}
          loadingLabel="Validando credenciales…"
          className="mt-1 w-full bg-amber-500 text-slate-950 hover:bg-amber-400"
        >
          Entrar
        </WeldixButton>
      </form>
    </AuthLayout>
  )
}

export default LoginPage
