import { useState } from 'react'
import { useSuperAdmin } from '../hooks/useSuperAdmin'

const STATUS_CONFIG = {
  paying: {
    label: 'Pagando',
    dot: 'bg-emerald-400',
    cls: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
  },
  trial: {
    label: 'Trial',
    dot: 'bg-amber-400',
    cls: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
  },
  expired: {
    label: 'Expirado',
    dot: 'bg-red-400',
    cls: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
  },
  active: {
    label: 'Activo',
    dot: 'bg-sky-400',
    cls: 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20',
  },
}

const conversionRate = (paying, total) => (total ? Math.round((paying / total) * 100) : 0)

const MetricCard = ({ label, value, sub, accent }) => (
  <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-sm">
    <div
      className={`absolute inset-x-0 top-0 h-px ${accent ?? 'bg-gradient-to-r from-transparent via-white/10 to-transparent'}`}
    />
    <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">{label}</p>
    <p className="mt-3 text-4xl font-bold tabular-nums text-white">{value ?? '—'}</p>
    {sub && <p className="mt-1.5 text-xs text-zinc-600">{sub}</p>}
  </div>
)

const LoginForm = ({ onLogin, isLoading, error }) => {
  const [input, setInput] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) onLogin(input.trim())
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
      {/* Grid background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative w-full max-w-sm">
        {/* Glow */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/10 to-transparent opacity-50" />

        <div className="relative rounded-2xl border border-white/8 bg-white/[0.04] p-8 backdrop-blur-xl">
          {/* Logo area */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
              <svg
                className="h-6 w-6 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
                />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-lg font-semibold tracking-tight text-white">Weldix Admin</h1>
              <p className="mt-0.5 text-xs text-zinc-500">Acceso restringido · Solo founder</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor="sa-key" className="sr-only">
              Clave de acceso
            </label>
            <input
              id="sa-key"
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Clave de acceso"
              className="w-full rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
              autoFocus
            />

            {error && (
              <p className="flex items-center gap-1.5 text-xs text-red-400">
                <span className="h-1 w-1 rounded-full bg-red-400" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-busy={isLoading}
              aria-label={isLoading ? 'Verificando clave de acceso…' : 'Acceder'}
              className="w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              {isLoading ? 'Verificando...' : 'Acceder'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.active
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

const WorkspaceRow = ({ w }) => {
  const created = w.created_at ? new Date(w.created_at).toLocaleDateString('es-ES') : '—'
  const trialDays = w.status === 'trial' && w.trial_days_left !== null ? w.trial_days_left : null

  return (
    <tr className="group border-t border-white/5 transition hover:bg-white/[0.02]">
      <td className="px-5 py-3.5">
        <p className="font-medium text-white">{w.nombre}</p>
        <p className="mt-0.5 text-xs text-zinc-600">{w.slug}</p>
      </td>
      <td className="px-5 py-3.5">
        <StatusBadge status={w.status} />
      </td>
      <td className="px-5 py-3.5 text-sm text-zinc-400">{w.plan ?? '—'}</td>
      <td className="px-5 py-3.5 text-sm">
        {trialDays !== null ? (
          <span className={trialDays <= 3 ? 'font-semibold text-red-400' : 'text-zinc-400'}>
            {trialDays}d
          </span>
        ) : (
          <span className="text-zinc-700">—</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-sm text-zinc-400">{w.user_count}</td>
      <td className="px-5 py-3.5 text-sm text-zinc-600">{created}</td>
      <td className="px-5 py-3.5 font-mono text-xs text-zinc-700">{w.stripe_customer_id ?? '—'}</td>
    </tr>
  )
}

const Dashboard = ({ metrics, workspaces, isLoading, onRefresh, onLogout }) => {
  const rate = conversionRate(metrics.paying, metrics.total_workspaces)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Grid bg */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Top bar */}
      <header className="relative border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10">
              <svg
                className="h-4 w-4 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
                />
              </svg>
            </div>
            <div>
              <span className="text-sm font-semibold text-white">Weldix</span>
              <span className="ml-2 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-500">
                Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              aria-busy={isLoading}
              aria-label={isLoading ? 'Actualizando datos…' : 'Actualizar datos'}
              className="flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-white/15 hover:text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            >
              <svg
                className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isLoading ? 'Actualizando' : 'Actualizar'}
            </button>
            <button
              onClick={onLogout}
              aria-label="Cerrar sesión de admin"
              className="flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-red-500/40 hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01-3-3h4a3 3 0 013 3v1"
                />
              </svg>
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Panel de operaciones</h1>
          <p className="mt-1 text-sm text-zinc-600">Vista global de todos los talleres en Weldix</p>
        </div>

        {/* Metrics */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label="Workspaces"
            value={metrics.total_workspaces}
            sub={`${metrics.total_users ?? 0} usuarios totales`}
            accent="bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
          <MetricCard
            label="Pagando"
            value={metrics.paying}
            sub={`${rate}% conversión trial → pago`}
            accent="bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"
          />
          <MetricCard
            label="En trial"
            value={metrics.trial}
            sub="activos con acceso completo"
            accent="bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"
          />
          <MetricCard
            label="Churn"
            value={metrics.expired}
            sub="trial expirado sin contratar"
            accent="bg-gradient-to-r from-transparent via-red-500/20 to-transparent"
          />
        </div>

        {/* Workspaces table */}
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Talleres registrados</h2>
              <p className="mt-0.5 text-xs text-zinc-600">{workspaces.length} workspaces</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  {['Taller', 'Estado', 'Plan', 'Trial', 'Usuarios', 'Creado', 'Stripe ID'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {workspaces.map((w) => (
                  <WorkspaceRow key={w.id} w={w} />
                ))}
                {workspaces.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-600">
                      No hay workspaces todavía
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

const SuperAdminPage = () => {
  const { isAuthenticated, metrics, workspaces, isLoading, error, login, refresh, logout } =
    useSuperAdmin()

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} isLoading={isLoading} error={error} />
  }

  return (
    <Dashboard
      metrics={metrics}
      workspaces={workspaces}
      isLoading={isLoading}
      onRefresh={refresh}
      onLogout={logout}
    />
  )
}

export default SuperAdminPage
