import AuthLayout from './AuthLayout'
import { authTw, cx } from '../utils/tw'
import { useRegisterForm } from '../hooks/useRegisterForm'

function RegisterPage() {
  const { name, setName, email, setEmail, password, setPassword, feedback, error, isSubmitting, submit } =
    useRegisterForm()

  return (
    <AuthLayout
      mode="register"
      title="Crear cuenta"
      subtitle="Registro de operario. Los administradores son creados por el jefe de taller."
      feedback={feedback}
      error={error}
    >
      <form onSubmit={submit} className={authTw.formGrid}>
        <label htmlFor="register-name" className={authTw.fieldLabel}>
          NOMBRE
        </label>
        <div className={authTw.fieldShell}>
          <span className={authTw.fieldIcon}>N</span>
          <input
            id="register-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            onChange={(e) => setEmail(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
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
