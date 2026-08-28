import { useState } from 'react'
import { useSuperAdmin } from '../hooks/useSuperAdmin'
import { useTheme } from '../../core/lib/ThemeContext'
import PageHeader from '../../core/components/PageHeader'
import PanelCard from '../../core/components/PanelCard'
import WeldixButton from '../../core/components/WeldixButton'

const STATUS_CONFIG = {
  paying: {
    label: 'Pagando',
    dot: 'bg-emerald-400',
    cls: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
  },
  trial: {
    label: 'En prueba',
    dot: 'bg-amber-400',
    cls: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
  },
  expired: {
    label: 'Prueba caducada',
    dot: 'bg-rose-400',
    cls: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20',
  },
  active: {
    label: 'Sin límite',
    dot: 'bg-slate-400',
    cls: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20',
  },
}

const conversionRate = (paying, total) => (total ? Math.round((paying / total) * 100) : 0)

const roleBadge =
  'rounded-sm border border-amber-700/50 bg-amber-500/10 px-1.5 py-0.5 text-xs font-bold tracking-[0.12em] text-amber-400'
const fieldShell =
  'flex min-h-[48px] items-center rounded-lg border border-slate-700 bg-slate-900/70 transition focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20'
const inputBase =
  'w-full bg-transparent px-3.5 text-[0.95rem] text-slate-100 outline-none placeholder:text-slate-500'

const MetricCard = ({ label, value, sub }) => (
  <PanelCard>
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-2 text-3xl font-extrabold tabular-nums text-[var(--app-text)]">
      {value ?? '—'}
    </p>
    {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
  </PanelCard>
)

const Brand = ({ isDark }) => (
  <div className="flex items-center gap-2">
    <img
      src={isDark ? '/weldix-logo-white.svg' : '/weldix-logo.svg'}
      alt="Weldix"
      className="h-6 w-auto object-contain"
    />
    <span className={roleBadge}>Superadmin</span>
  </div>
)

const LoginForm = ({ onLogin, isLoading, error, isDark }) => {
  const [input, setInput] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) onLogin(input.trim())
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--app-bg)] px-6">
      <PanelCard className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img
            src={isDark ? '/weldix-logo-white.svg' : '/weldix-logo.svg'}
            alt="Weldix"
            className="h-7 w-auto object-contain"
          />
          <div>
            <h1 className="text-lg font-bold text-[var(--app-text)]">Panel de control</h1>
            <p className="mt-0.5 text-xs text-slate-500">Acceso restringido al fundador</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label htmlFor="sa-key" className="sr-only">
            Clave de acceso
          </label>
          <div className={fieldShell}>
            <input
              id="sa-key"
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Clave de acceso"
              autoFocus
              className={inputBase}
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-rose-400">
              <span className="h-1 w-1 shrink-0 rounded-full bg-rose-400" />
              {error}
            </p>
          )}

          <WeldixButton
            type="submit"
            variant="warning"
            size="md"
            disabled={!input.trim()}
            isLoading={isLoading}
            loadingLabel="Verificando clave de acceso…"
            className="w-full"
          >
            Acceder
          </WeldixButton>
        </form>
      </PanelCard>
    </main>
  )
}

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.active
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.cls}`}
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
    <tr className="border-t" style={{ borderColor: 'var(--card-border)' }}>
      <td className="px-4 py-3">
        <p className="font-semibold text-[var(--app-text)]">{w.nombre}</p>
        <p className="mt-0.5 text-xs text-slate-500">{w.slug}</p>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={w.status} />
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">{w.plan ?? '—'}</td>
      <td className="px-4 py-3 text-sm">
        {trialDays !== null ? (
          <span className={trialDays <= 3 ? 'font-bold text-rose-400' : 'text-slate-400'}>
            {trialDays}d
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">{w.user_count}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{created}</td>
      <td className="px-4 py-3 font-mono text-xs text-slate-600">{w.stripe_customer_id ?? '—'}</td>
    </tr>
  )
}

const headerAction = ({ isLoading, onRefresh, onLogout }) => (
  <div className="flex items-center gap-2">
    <WeldixButton
      variant="secondary"
      size="sm"
      onClick={onRefresh}
      isLoading={isLoading}
      loadingLabel="Actualizando…"
    >
      <i className="bx bx-refresh text-base" aria-hidden="true" />
      Actualizar
    </WeldixButton>
    <WeldixButton variant="ghost" size="sm" onClick={onLogout} aria-label="Cerrar sesión de admin">
      <i className="bx bx-log-out text-base" aria-hidden="true" />
      Salir
    </WeldixButton>
  </div>
)

const Dashboard = ({ metrics, workspaces, isLoading, onRefresh, onLogout, isDark }) => {
  const rate = conversionRate(metrics.paying, metrics.total_workspaces)

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <header className="border-b" style={{ borderColor: 'var(--card-border)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Brand isDark={isDark} />
          {headerAction({ isLoading, onRefresh, onLogout })}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <PageHeader
          label="Vista global"
          title="Talleres en Weldix"
          description={`${workspaces.length} talleres registrados`}
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Talleres"
            value={metrics.total_workspaces}
            sub={`${metrics.total_users ?? 0} usuarios totales`}
          />
          <MetricCard
            label="Pagando"
            value={metrics.paying}
            sub={`${rate}% de conversión prueba → pago`}
          />
          <MetricCard label="En prueba" value={metrics.trial} sub="con acceso completo" />
          <MetricCard label="Prueba caducada" value={metrics.expired} sub="sin contratar todavía" />
        </div>

        <PanelCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--card-border)' }}>
                  {['Taller', 'Estado', 'Plan', 'Prueba', 'Usuarios', 'Creado', 'Stripe ID'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500"
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
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                      No hay talleres todavía
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PanelCard>
      </main>
    </div>
  )
}

const SuperAdminPage = () => {
  const { isAuthenticated, metrics, workspaces, isLoading, error, login, refresh, logout } =
    useSuperAdmin()
  const { isDark } = useTheme()

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} isLoading={isLoading} error={error} isDark={isDark} />
  }

  return (
    <Dashboard
      metrics={metrics}
      workspaces={workspaces}
      isLoading={isLoading}
      onRefresh={refresh}
      onLogout={logout}
      isDark={isDark}
    />
  )
}

export default SuperAdminPage
