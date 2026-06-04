import AppShell from '../../core/components/AppShell'
import PageHeader from '../../core/components/PageHeader'
import PanelCard from '../../core/components/PanelCard'
import WeldixButton from '../../core/components/WeldixButton'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import FichajeCalendar from '../../fichaje/components/FichajeCalendar'
import { useProfile } from '../hooks/useProfile'

const roleLabel = (role) => (role === 'admin' ? 'Administrador' : 'Operario')

const fieldShell =
  'flex min-h-[48px] items-center rounded-lg border border-slate-700 bg-slate-900/70 transition focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20'
const inputBase =
  'w-full bg-transparent px-3.5 text-[0.95rem] text-slate-100 outline-none placeholder:text-slate-500'
const labelBase = 'mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400'

const feedbackOk = ({ msg }) => msg && <p className="mt-2 text-sm text-emerald-400">{msg}</p>
const feedbackErr = ({ msg }) => msg && <p className="mt-2 text-sm text-rose-400">{msg}</p>
const submitBtn = ({ label, loading }) => (
  <WeldixButton
    type="submit"
    variant="warning"
    size="md"
    isLoading={loading}
    loadingLabel="Guardando…"
    className="mt-3 w-full"
  >
    {label}
  </WeldixButton>
)

const ProfilePage = () => {
  const state = useProfile()
  const { profile } = useAuthSession()
  const isOperario = profile?.role !== 'admin'

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[520px] space-y-3">
        <PageHeader label="Cuenta" title="Perfil" />

        {/* Info de cuenta — solo lectura */}
        <PanelCard>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            Mi cuenta
          </h2>
          <div className="mt-2 grid gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Email
              </p>
              <p className="mt-0.5 text-sm text-slate-300">{state.profile?.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Rol
              </p>
              <p className="mt-0.5 text-sm text-slate-300">{roleLabel(state.profile?.role)}</p>
            </div>
          </div>
        </PanelCard>

        {/* Editar nombre */}
        <PanelCard>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            Datos personales
          </h2>
          <form onSubmit={state.submitProfile} className="mt-1">
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
        </PanelCard>

        {/* Calendario de fichajes — solo operarios */}
        {isOperario && (
          <div>
            <h2 className="mb-2.5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Mis jornadas
            </h2>
            <FichajeCalendar />
          </div>
        )}

        {/* Cambiar contraseña */}
        <PanelCard>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            Cambiar contraseña
          </h2>
          <form onSubmit={state.submitPassword} className="mt-1">
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
        </PanelCard>
      </div>
    </AppShell>
  )
}

export default ProfilePage
