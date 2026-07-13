import { useState } from 'react'

const AVATAR_GRADIENTS = [
  { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-300' },
  { bg: 'bg-violet-500/20', border: 'border-violet-500/30', text: 'text-violet-300' },
  { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-300' },
  { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-300' },
  { bg: 'bg-rose-500/20', border: 'border-rose-500/30', text: 'text-rose-300' },
]

const hashName = (name) => (name || '?').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
const avatarGrad = (name) => AVATAR_GRADIENTS[hashName(name) % AVATAR_GRADIENTS.length]
const initials = (name) =>
  (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()

const isTooShort = (pwd) => !pwd || pwd.length < 8
const validationError = (pwd) => (isTooShort(pwd) ? 'Mínimo 8 caracteres' : null)

const ResetPasswordModal = ({ user, onClose, onResetPassword }) => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const executeReset = async () => {
    setIsSaving(true)
    setError('')
    const result = await onResetPassword(user.id, password)
    setIsSaving(false)
    return result.ok ? setDone(true) : setError(result.error ?? 'No se pudo restablecer')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const err = validationError(password)
    return err ? setError(err) : executeReset()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-slate-100">Restablecer contraseña</h3>
        <p className="mt-1 text-sm text-slate-400">
          {user.full_name || user.email} — dile la nueva contraseña al operario.
        </p>

        {done ? (
          <div className="mt-5">
            <p className="rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-4 py-3 text-sm font-semibold text-emerald-300">
              Contraseña actualizada. Ya puede iniciar sesión con ella.
            </p>
            <button
              onClick={onClose}
              className="mt-4 h-11 w-full rounded-lg bg-slate-700 text-sm font-semibold text-slate-100 hover:bg-slate-600"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            <div>
              <label
                htmlFor={`reset-pwd-${user.id}`}
                className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                Nueva contraseña
              </label>
              <input
                id={`reset-pwd-${user.id}`}
                type="text"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-11 flex-1 rounded-lg bg-slate-800 text-sm font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-11 flex-1 rounded-lg bg-amber-500 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
              >
                {isSaving ? 'Guardando…' : 'Restablecer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

const AdminUserRow = ({ user, onResetPassword, onRegeneratePin }) => {
  const grad = avatarGrad(user.full_name || user.email)
  const workerCode = Number.isFinite(user.worker_number)
    ? `OP-${String(user.worker_number).padStart(3, '0')}`
    : null
  const [showReset, setShowReset] = useState(false)
  const [pin, setPin] = useState(user.pin)
  const [regenerating, setRegenerating] = useState(false)

  const handleRegen = async () => {
    setRegenerating(true)
    const result = await onRegeneratePin(user.id)
    setRegenerating(false)
    return result.ok ? setPin(result.pin) : undefined
  }

  return (
    <div
      className="flex items-center justify-between rounded-lg border bg-[var(--card-bg)] px-4 py-3"
      style={{ borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow-sm)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-bold tracking-wide ${grad.bg} ${grad.border} ${grad.text}`}
        >
          {initials(user.full_name || user.email)}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">{user.full_name || '-'}</p>
          <p className="text-xs text-slate-400">{user.email}</p>
          {workerCode && (
            <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-slate-500">
              {workerCode}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {pin && (
          <span
            className="rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 font-mono text-xs font-bold tracking-wider text-slate-200"
            title="PIN de fichaje en el kiosko"
          >
            PIN {pin}
          </span>
        )}
        {onRegeneratePin && (
          <button
            onClick={handleRegen}
            disabled={regenerating}
            aria-label={`Regenerar PIN de ${user.full_name || user.email}`}
            title="Regenerar PIN"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:border-amber-500/50 hover:text-amber-300 disabled:opacity-50"
          >
            <i
              className={`bx bx-refresh text-lg ${regenerating ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          </button>
        )}
        {onResetPassword && (
          <button
            onClick={() => setShowReset(true)}
            aria-label={`Restablecer contraseña de ${user.full_name || user.email}`}
            title="Restablecer contraseña"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:border-amber-500/50 hover:text-amber-300"
          >
            <i className="bx bx-key text-lg" aria-hidden="true" />
          </button>
        )}
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.12em] ${user.roleConfig.classes}`}
        >
          {user.roleConfig.label}
        </span>
      </div>

      {showReset && (
        <ResetPasswordModal
          user={user}
          onResetPassword={onResetPassword}
          onClose={() => setShowReset(false)}
        />
      )}
    </div>
  )
}

export default AdminUserRow
