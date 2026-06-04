import { useEffect, useState } from 'react'

import AppShell from '../../core/components/AppShell'
import OnboardingWizard from '../../core/components/OnboardingWizard'
import PanelCard from '../../core/components/PanelCard'
import WeldixButton from '../../core/components/WeldixButton'
import useOnboarding from '../../core/hooks/useOnboarding'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { useWorkerDashboard } from '../hooks/useWorkerDashboard'
import { useIaContext } from '../../ia/lib/IaContext'
import AdminJobsSection from '../../admin/components/AdminJobsSection'
import JornadaButton from '../../fichaje/components/JornadaButton'
import ActiveJobCard from './ActiveJobCard'
import MetricCard from './MetricCard'
import NewJobModal from './NewJobModal'
import RegisterMaterialModal from './RegisterMaterialModal'
import StartJobByOrtModal from './StartJobByOrtModal'
import RegistroHorasOT from '../../registro_horas/components/RegistroHorasOT'
import SectionHeader from './SectionHeader'
import TodayJobItem from './TodayJobItem'

const loadingState = ({ isLoading, isEmpty }) =>
  (isLoading || isEmpty) && (
    <PanelCard>
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
        Cargando panel...
      </p>
      <div className="mt-3 h-2 w-full animate-pulse rounded bg-slate-800" />
      <div className="mt-2 h-2 w-2/3 animate-pulse rounded bg-slate-800" />
    </PanelCard>
  )

const errorState = ({ isLoading, error, refresh }) =>
  !isLoading &&
  error && (
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
    <WeldixButton variant="warning" size="sm" onClick={onOpen}>
      + Nuevo trabajo
    </WeldixButton>
  )

const startByOrtButton = ({ isAdmin, hasActiveJob, onOpen }) =>
  !isAdmin &&
  !hasActiveJob && (
    <WeldixButton variant="warning" size="lg" onClick={onOpen} className="w-full">
      + Iniciar trabajo por OT
    </WeldixButton>
  )

const activeJobSection = ({ activeJob, onComplete, onOpenMaterialModal }) =>
  activeJob ? (
    <>
      <ActiveJobCard
        job={activeJob}
        onComplete={onComplete}
        onRegisterMaterial={onOpenMaterialModal}
      />
      <RegistroHorasOT jobId={activeJob.id} />
    </>
  ) : (
    <PanelCard>
      <p className="text-sm text-slate-400">Sin trabajo activo en este momento.</p>
    </PanelCard>
  )

const pendingJobsSection = ({ todayJobs, onStartJob, canStart }) =>
  todayJobs.length > 0 && (
    <section>
      <SectionHeader title="Pendientes asignados" />
      <div className="space-y-2">
        {todayJobs.map((job) => (
          <TodayJobItem
            key={job.id}
            job={job}
            onStart={() => onStartJob(job.id)}
            canStart={canStart}
          />
        ))}
      </div>
    </section>
  )

const WorkerDashboardPage = () => {
  const { profile } = useAuthSession()
  const {
    dashboard,
    isLoading,
    isEmpty,
    error,
    refresh,
    markActiveJobCompleted,
    startPendingJob,
    registerMaterialUsage,
  } = useWorkerDashboard()
  const { show: showOnboarding, complete: completeOnboarding } = useOnboarding(profile)

  const [showModal, setShowModal] = useState(false)
  const [showOrtModal, setShowOrtModal] = useState(false)
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [createdFeedback, setCreatedFeedback] = useState('')

  const isAdmin = profile?.role === 'admin'
  const { setPageContext } = useIaContext()

  // Inyectar contexto del dashboard en la IA cuando cargan los datos
  useEffect(() => {
    if (!dashboard) return

    if (!isAdmin) {
      const activeJobText = dashboard.activeJob
        ? `Trabajo activo: ${dashboard.activeJob.code} — ${dashboard.activeJob.titulo} (estado: ${dashboard.activeJob.estado})`
        : 'Sin trabajo activo ahora mismo'
      setPageContext({
        seccion: 'Inicio — Panel del operario',
        resumen: activeJobText,
        sugerencias: [
          '¿Cómo avanzo el estado de mi trabajo activo?',
          '¿Qué hago si detecto un defecto en la soldadura?',
          '¿Qué EPI necesito para soldar acero inoxidable?',
          '¿Cómo registro el material que he consumido?',
        ],
      })
    } else {
      setPageContext({
        seccion: 'Inicio — Panel del administrador',
        resumen: `Panel de administración del taller. Gestión de trabajos, operarios y stock.`,
        sugerencias: [
          '¿Cuántos trabajos están en proceso ahora?',
          '¿Qué materiales tienen stock bajo?',
          '¿Cómo asigno un trabajo a un operario?',
          'Resume el estado actual del taller',
        ],
      })
    }
    return () => setPageContext(null)
  }, [dashboard, isAdmin, setPageContext])

  const handleCreated = (newJob) => {
    setShowModal(false)
    setCreatedFeedback(`Trabajo "${newJob.title}" creado correctamente.`)
    setTimeout(() => setCreatedFeedback(''), 4000)
  }

  return (
    <AppShell>
      {showOnboarding && <OnboardingWizard onComplete={completeOnboarding} />}
      <div
        className={`mx-auto w-full ${isAdmin ? 'max-w-[1100px]' : 'max-w-[680px]'} space-y-4 pb-5`}
      >
        {loadingState({ isLoading, isEmpty })}
        {errorState({ isLoading, error, refresh })}
        {createdFeedbackBanner({ createdFeedback })}

        {!isLoading && dashboard && (
          <>
            <section className="rounded-xl border border-white/[0.07] bg-gradient-to-br from-amber-900/20 via-slate-900/60 to-slate-900/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* Avatar con iniciales del operario */}
                  <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm font-bold tracking-wide text-amber-300">
                    {dashboard.greeting.operatorName
                      .split(' ')
                      .slice(0, 2)
                      .map((palabra) => palabra[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
                      {dashboard.greeting.greetingLabel}
                    </p>
                    <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight">
                      {dashboard.greeting.operatorName}
                    </h1>
                    <p className="mt-1 text-sm text-slate-400">
                      {dashboard.greeting.dateLabel} · {dashboard.greeting.shiftLabel}
                    </p>
                  </div>
                </div>
                {adminNewJobButton({ isAdmin, onOpen: () => setShowModal(true) })}
              </div>
              {/* Fichaje de jornada — solo visible para operarios */}
              {!isAdmin && <JornadaButton />}
            </section>

            {!isAdmin && (
              <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {dashboard.metrics.map((metric) => (
                  <MetricCard key={metric.key} item={metric} />
                ))}
              </section>
            )}

            {!isAdmin && (
              <section>
                <SectionHeader title="Trabajo activo" />
                {activeJobSection({
                  activeJob: dashboard.activeJob,
                  onComplete: markActiveJobCompleted,
                  onOpenMaterialModal: () => setShowMaterialModal(true),
                })}
                {startByOrtButton({
                  isAdmin,
                  hasActiveJob: Boolean(dashboard.activeJob),
                  onOpen: () => setShowOrtModal(true),
                })}
              </section>
            )}

            {!isAdmin &&
              pendingJobsSection({
                todayJobs: dashboard.todayJobs,
                onStartJob: startPendingJob,
                canStart: !dashboard.activeJob,
              })}

            {isAdmin && <AdminJobsSection />}
          </>
        )}
      </div>

      {showModal && <NewJobModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
      {showOrtModal && (
        <StartJobByOrtModal onClose={() => setShowOrtModal(false)} onStart={startPendingJob} />
      )}
      {showMaterialModal && dashboard?.stock && (
        <RegisterMaterialModal
          stock={dashboard.stock}
          onClose={() => setShowMaterialModal(false)}
          onConfirm={registerMaterialUsage}
        />
      )}
    </AppShell>
  )
}

export default WorkerDashboardPage
