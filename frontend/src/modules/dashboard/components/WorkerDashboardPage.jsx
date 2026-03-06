import { useState } from 'react'

import AppShell from '../../core/components/AppShell'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { useWorkerDashboard } from '../hooks/useWorkerDashboard'
import ActiveJobCard from './ActiveJobCard'
import MetricCard from './MetricCard'
import NewJobModal from './NewJobModal'
import PanelCard from './PanelCard'
import SectionHeader from './SectionHeader'

const loadingState = ({ isLoading, isEmpty }) =>
  (isLoading || isEmpty) && (
    <PanelCard>
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">Cargando panel...</p>
      <div className="mt-3 h-2 w-full animate-pulse rounded bg-slate-800" />
      <div className="mt-2 h-2 w-2/3 animate-pulse rounded bg-slate-800" />
    </PanelCard>
  )

const errorState = ({ isLoading, error, refresh }) =>
  !isLoading && error && (
    <PanelCard className="border-rose-700/40">
      <p className="text-sm font-semibold text-rose-300">{error}</p>
      <button
        type="button"
        onClick={refresh}
        className="mt-3 rounded-lg border border-rose-500/40 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10"
      >
        Reintentar
      </button>
    </PanelCard>
  )

const createdFeedbackBanner = ({ createdFeedback }) =>
  createdFeedback && (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
      <p className="text-sm font-semibold text-emerald-300">{createdFeedback}</p>
    </div>
  )

const adminNewJobButton = ({ isAdmin, onOpen }) =>
  isAdmin && (
    <button
      type="button"
      onClick={onOpen}
      className="shrink-0 rounded-xl border border-sky-500/50 bg-sky-500/15 px-3 py-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-sky-300 transition hover:border-sky-400/70 hover:bg-sky-500/25"
    >
      + Nuevo trabajo
    </button>
  )

const activeJobSection = ({ activeJob, onComplete, onRegisterMaterial }) =>
  activeJob
    ? <ActiveJobCard job={activeJob} onComplete={onComplete} onRegisterMaterial={onRegisterMaterial} />
    : <PanelCard><p className="text-sm text-slate-300">No hay trabajo activo en este momento.</p></PanelCard>

const modalOverlay = ({ showModal, onClose, onCreated }) =>
  showModal && <NewJobModal onClose={onClose} onCreated={onCreated} />

function WorkerDashboardPage() {
  const { profile } = useAuthSession()
  const { dashboard, isLoading, isEmpty, error, refresh, markActiveJobCompleted, registerMaterialUsage } =
    useWorkerDashboard()

  const [showModal, setShowModal] = useState(false)
  const [createdFeedback, setCreatedFeedback] = useState('')

  const isAdmin = profile?.role === 'admin'

  const handleCreated = (newJob) => {
    setShowModal(false)
    setCreatedFeedback(`Trabajo "${newJob.title}" creado correctamente.`)
    setTimeout(() => setCreatedFeedback(''), 4000)
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[680px] space-y-4 pb-5">
        {loadingState({ isLoading, isEmpty })}
        {errorState({ isLoading, error, refresh })}
        {createdFeedbackBanner({ createdFeedback })}

        {!isLoading && dashboard && (
          <>
            <section className="rounded-xl border border-cyan-900/50 bg-slate-900/55 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.64rem] font-bold uppercase tracking-[0.2em] text-sky-300">
                    {dashboard.greeting.greetingLabel}
                  </p>
                  <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-slate-100">
                    {dashboard.greeting.operatorName}
                  </h1>
                  <p className="mt-1 text-sm text-slate-400">
                    {dashboard.greeting.dateLabel} - {dashboard.greeting.shiftLabel}
                  </p>
                </div>
                {adminNewJobButton({ isAdmin, onOpen: () => setShowModal(true) })}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {dashboard.metrics.map((metric) => (
                <MetricCard key={metric.key} item={metric} />
              ))}
            </section>

            <section>
              <SectionHeader title="Trabajo activo" />
              {activeJobSection({
                activeJob: dashboard.activeJob,
                onComplete: markActiveJobCompleted,
                onRegisterMaterial: registerMaterialUsage,
              })}
            </section>
          </>
        )}
      </div>

      {modalOverlay({ showModal, onClose: () => setShowModal(false), onCreated: handleCreated })}
    </AppShell>
  )
}

export default WorkerDashboardPage
