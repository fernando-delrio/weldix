import AppShell from '../../layouts/app-shell/AppShell'
import { useOperarioDashboard } from '../../features/dashboard/hooks/useOperarioDashboard'
import ActiveJobCard from '../../features/dashboard/components/ActiveJobCard'
import MetricCard from '../../features/dashboard/components/MetricCard'
import PanelCard from '../../features/dashboard/components/PanelCard'
import SectionHeader from '../../features/dashboard/components/SectionHeader'
import StockItem from '../../features/dashboard/components/StockItem'
import TodayJobItem from '../../features/dashboard/components/TodayJobItem'

function DashboardLoadingState() {
  return (
    <PanelCard>
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Cargando panel...</p>
      <div className="mt-3 h-2 w-full animate-pulse rounded bg-slate-800" />
      <div className="mt-2 h-2 w-2/3 animate-pulse rounded bg-slate-800" />
    </PanelCard>
  )
}

function DashboardErrorState({ error, onRetry }) {
  return (
    <PanelCard className="border-rose-700/40">
      <p className="text-sm font-semibold text-rose-300">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg border border-rose-500/40 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10"
      >
        Reintentar
      </button>
    </PanelCard>
  )
}

function OperarioDashboardPage() {
  const {
    dashboard,
    isLoading,
    isEmpty,
    error,
    refresh,
    markActiveJobCompleted,
    registerMaterialUsage,
  } = useOperarioDashboard()

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[680px] space-y-4 pb-5">
        {isLoading || isEmpty ? <DashboardLoadingState /> : null}
        {!isLoading && error ? <DashboardErrorState error={error} onRetry={refresh} /> : null}

        {!isLoading && dashboard ? (
          <>
            <section className="rounded-xl border border-cyan-900/50 bg-slate-900/55 p-4">
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.2em] text-sky-300">
                {dashboard.greeting.greetingLabel}
              </p>
              <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-slate-100">
                {dashboard.greeting.operatorName}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {dashboard.greeting.dateLabel} - {dashboard.greeting.shiftLabel}
              </p>
            </section>

            <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {dashboard.metrics.map((metric) => (
                <MetricCard key={metric.key} item={metric} />
              ))}
            </section>

            <section>
              <SectionHeader title="Trabajo activo" />
              {dashboard.activeJob ? (
                <ActiveJobCard
                  job={dashboard.activeJob}
                  onComplete={markActiveJobCompleted}
                  onRegisterMaterial={registerMaterialUsage}
                />
              ) : (
                <PanelCard>
                  <p className="text-sm text-slate-300">No hay trabajo activo en este momento.</p>
                </PanelCard>
              )}
            </section>

            <section>
              <SectionHeader title="Mis trabajos de hoy" actionLabel="Ver todos" actionTo="/app/trabajos" />
              <div className="space-y-2.5">
                {dashboard.todayJobs.map((job) => (
                  <TodayJobItem key={job.id} job={job} />
                ))}
              </div>
            </section>

            <section>
              <SectionHeader title="Stock materiales" actionLabel="Registrar uso" actionTo="/app/stock" />
              <div className="space-y-2.5">
                {dashboard.stock.map((item) => (
                  <StockItem key={item.id} item={item} />
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  )
}

export default OperarioDashboardPage
