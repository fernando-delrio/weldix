import AppShell from '../../core/components/AppShell'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import FichajeCalendar from '../../fichaje/components/FichajeCalendar'
import { useProfile } from '../hooks/useProfile'

const roleLabel = (role) => role === 'admin' ? 'Administrador' : 'Operario'

const fieldShell = 'flex min-h-[48px] items-center rounded-lg border border-slate-700 bg-slate-900/70 transition focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20'
const inputBase  = 'w-full bg-transparent px-3.5 text-[0.95rem] text-slate-100 outline-none placeholder:text-slate-500'
const labelBase  = 'mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-400'
const cardBase   = 'rounded-xl border border-cyan-900/50 bg-slate-900/65 p-5'

const feedbackOk  = ({ msg }) => msg && <p className="mt-2 text-sm text-emerald-400">{msg}</p>
const feedbackErr = ({ msg }) => msg && <p className="mt-2 text-sm text-rose-400">{msg}</p>
const submitBtn   = ({ label, loading }) => (
  <button
    type="submit"
    disabled={loading}
    className="mt-4 h-11 w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-sm font-bold tracking-[0.08em] text-white transition hover:from-sky-400 hover:to-blue-500 disabled:opacity-60"
  >
    {loading ? 'Guardando...' : label}
  </button>
)

const ProfilePage = () => {
  const state   = useProfile()
  const { profile } = useAuthSession()
  const isOperario = profile?.role !== 'admin'

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[520px] space-y-5 pb-5">

        {/* Info de cuenta — solo lectura */}
        <section className={cardBase}>
          <h2 className="text-lg font-bold tracking-tight text-slate-100">Mi cuenta</h2>
          <div className="mt-4 grid gap-3">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-500">Email</p>
              <p className="mt-0.5 text-sm text-slate-300">{state.profile?.email}</p>
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-500">Rol</p>
              <p className="mt-0.5 text-sm text-slate-300">{roleLabel(state.profile?.role)}</p>
            </div>
          </div>
        </section>

        {/* Editar nombre */}
        <section className={cardBase}>
          <h2 className="text-lg font-bold tracking-tight text-slate-100">Datos personales</h2>
          <form onSubmit={state.submitProfile} className="mt-2">
            <label className={labelBase}>Nombre completo</label>
            <div className={fieldShell}>
              <input
                type="text"
                value={state.fullName}
                onChange={(e) => state.setFullName(e.target.value)}
                placeholder="Tu nombre"
                required
                className={inputBase}
              />
            </div>
            {feedbackOk({ msg: state.profileFeedback })}
            {feedbackErr({ msg: state.profileError })}
            {submitBtn({ label: 'Guardar nombre', loading: state.isSavingProfile })}
          </form>
        </section>

        {/* Calendario de fichajes — solo operarios */}
        {isOperario && (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Mis jornadas</h2>
            <FichajeCalendar />
          </section>
        )}

        {/* Cambiar contraseña */}
        <section className={cardBase}>
          <h2 className="text-lg font-bold tracking-tight text-slate-100">Cambiar contraseña</h2>
          <form onSubmit={state.submitPassword} className="mt-2">
            <label className={labelBase}>Contraseña actual</label>
            <div className={fieldShell}>
              <input
                type="password"
                value={state.currentPassword}
                onChange={(e) => state.setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={inputBase}
              />
            </div>

            <label className={labelBase}>Nueva contraseña</label>
            <div className={fieldShell}>
              <input
                type="password"
                value={state.newPassword}
                onChange={(e) => state.setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                className={inputBase}
              />
            </div>

            <label className={labelBase}>Confirmar nueva contraseña</label>
            <div className={fieldShell}>
              <input
                type="password"
                value={state.confirmPassword}
                onChange={(e) => state.setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                required
                className={inputBase}
              />
            </div>

            {feedbackOk({ msg: state.passwordFeedback })}
            {feedbackErr({ msg: state.passwordError })}
            {submitBtn({ label: 'Cambiar contraseña', loading: state.isSavingPassword })}
          </form>
        </section>

      </div>
    </AppShell>
  )
}

export default ProfilePage
