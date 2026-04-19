import { Link } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { authTw, cx } from '../utils/tw'
import useRegisterWorkspaceForm from '../hooks/useRegisterWorkspaceForm'

const RegisterWorkspacePage = () => {
  const { form, update, isSubmitting, error, feedback, submit } = useRegisterWorkspaceForm()

  return (
    <AuthLayout
      mode="register"
      title="Crea tu taller"
      subtitle="Empieza gratis en 30 segundos. Sin tarjeta."
      feedback={feedback}
      error={error}
    >
      <form onSubmit={submit} className={authTw.formGrid}>

        {/* Nombre del taller */}
        <label htmlFor="reg-taller" className={authTw.fieldLabel}>
          NOMBRE DEL TALLER
        </label>
        <div className={authTw.fieldShell}>
          <span className={authTw.fieldIcon}>⚒</span>
          <input
            id="reg-taller"
            type="text"
            value={form.nombre_taller}
            onChange={update('nombre_taller')}
            placeholder="Talleres García S.L."
            autoComplete="organization"
            required
            className={authTw.fieldInput}
          />
        </div>

        {/* Nombre del responsable */}
        <label htmlFor="reg-name" className={authTw.fieldLabel}>
          TU NOMBRE <span className="text-slate-600">(opcional)</span>
        </label>
        <div className={authTw.fieldShell}>
          <span className={authTw.fieldIcon}>👤</span>
          <input
            id="reg-name"
            type="text"
            value={form.admin_name}
            onChange={update('admin_name')}
            placeholder="Fernando García"
            autoComplete="name"
            className={authTw.fieldInput}
          />
        </div>

        {/* Email */}
        <label htmlFor="reg-email" className={authTw.fieldLabel}>
          CORREO ELECTRONICO
        </label>
        <div className={authTw.fieldShell}>
          <span className={authTw.fieldIcon}>@</span>
          <input
            id="reg-email"
            type="email"
            value={form.admin_email}
            onChange={update('admin_email')}
            placeholder="admin@mitaller.com"
            autoComplete="email"
            required
            className={authTw.fieldInput}
          />
        </div>

        {/* Contraseña */}
        <label htmlFor="reg-password" className={authTw.fieldLabel}>
          CONTRASENA (mín. 8 caracteres)
        </label>
        <div className={authTw.fieldShell}>
          <span className={authTw.fieldIcon}>#</span>
          <input
            id="reg-password"
            type="password"
            value={form.admin_password}
            onChange={update('admin_password')}
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={8}
            className={authTw.fieldInput}
          />
        </div>

        {/* Términos */}
        <label className="flex cursor-pointer items-start gap-3 mt-1">
          <input
            type="checkbox"
            checked={form.aceptar_terminos}
            onChange={update('aceptar_terminos')}
            className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500"
          />
          <span className="text-xs text-slate-400 leading-relaxed">
            Acepto los{' '}
            <Link to="/terminos" className="text-amber-400 underline hover:text-amber-300">
              términos y condiciones
            </Link>{' '}
            y la{' '}
            <Link to="/privacidad" className="text-amber-400 underline hover:text-amber-300">
              política de privacidad
            </Link>{' '}
            de Weldix.
          </span>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cx(authTw.primaryButton, authTw.primaryButtonWideTracking, 'mt-2')}
        >
          {isSubmitting ? 'CREANDO...' : 'CREAR MI TALLER  ->'}
        </button>

        <p className="mt-3 text-center text-xs text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-amber-400 hover:text-amber-300">
            Inicia sesión
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default RegisterWorkspacePage
