const AdminUserRow = ({ user }) => (
  <div className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3">
    <div>
      <p className="text-sm font-semibold text-slate-100">{user.full_name || '—'}</p>
      <p className="text-xs text-slate-400">{user.email}</p>
    </div>
    <span className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] ${user.roleConfig.classes}`}>
      {user.roleConfig.label}
    </span>
  </div>
)

export default AdminUserRow
