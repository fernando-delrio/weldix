const AVATAR_GRADIENTS = [
  { bg: 'bg-sky-500/20',     border: 'border-sky-500/30',     text: 'text-sky-300'     },
  { bg: 'bg-violet-500/20',  border: 'border-violet-500/30',  text: 'text-violet-300'  },
  { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-300' },
  { bg: 'bg-amber-500/20',   border: 'border-amber-500/30',   text: 'text-amber-300'   },
  { bg: 'bg-rose-500/20',    border: 'border-rose-500/30',    text: 'text-rose-300'    },
]

const hashName   = (name) => (name || '?').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
const avatarGrad = (name) => AVATAR_GRADIENTS[hashName(name) % AVATAR_GRADIENTS.length]
const initials   = (name) => (name || '?').split(' ').slice(0, 2).map((n) => n[0] ?? '').join('').toUpperCase()

const AdminUserRow = ({ user }) => {
  const grad = avatarGrad(user.full_name || user.email)
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-slate-900 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-bold tracking-wide ${grad.bg} ${grad.border} ${grad.text}`}>
          {initials(user.full_name || user.email)}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">{user.full_name || '—'}</p>
          <p className="text-xs text-slate-400">{user.email}</p>
        </div>
      </div>
      <span className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] ${user.roleConfig.classes}`}>
        {user.roleConfig.label}
      </span>
    </div>
  )
}

export default AdminUserRow
