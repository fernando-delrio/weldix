import { useState } from 'react'
import { Link } from 'react-router-dom'

import AppShell from '../../core/components/AppShell'
import PanelCard from '../../core/components/PanelCard'
import NewJobModal from '../../dashboard/components/NewJobModal'
import FichajesAdminSection from '../../fichaje/components/FichajesAdminSection'
import WeldixButton from '../../core/components/WeldixButton'
import { useAdminDashboard } from '../hooks/useAdminDashboard'
import AdminUserRow from './AdminUserRow'
import AdminChartsSection from './AdminChartsSection'
import CreateUserModal from './CreateUserModal'
import PageHeader from '../../core/components/PageHeader'
import SectionHeader from '../../dashboard/components/SectionHeader'
import { SkeletonCard, SkeletonMetricStrip } from '../../core/components/Skeleton'

// ── Guards de estado ─────────────────────────────────────────────────────────
const loadingState = ({ isLoading }) =>
  isLoading && (
    <div className="space-y-4">
      <SkeletonMetricStrip />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SkeletonCard rows={4} />
        <SkeletonCard rows={4} />
      </div>
      <SkeletonCard rows={4} />
    </div>
  )

// Un 403 no se arregla reintentando — es un problema de permisos, no de red.
// En vez del botón "Reintentar", ofrecemos volver a una pantalla que sí puede ver.
const forbiddenAction = () => (
  <Link
    to="/app"
    className="mt-3 inline-block rounded-lg border border-rose-500/40 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10"
  >
    Volver a Inicio
  </Link>
)

const retryAction = ({ refresh }) => (
  <WeldixButton variant="danger" size="sm" onClick={refresh} className="mt-3">
    Reintentar
  </WeldixButton>
)

const errorState = ({ isLoading, error, isForbidden, refresh }) =>
  !isLoading &&
  error && (
    <PanelCard className="border-rose-700/40">
      <p className="text-sm font-semibold text-rose-300">{error}</p>
      {isForbidden ? forbiddenAction() : retryAction({ refresh })}
    </PanelCard>
  )

const feedbackBanner = ({ feedback }) =>
  feedback && (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
      <p className="text-sm font-semibold text-emerald-300">{feedback}</p>
    </div>
  )

// ── Componente principal ─────────────────────────────────────────────────────
const AdminDashboardPage = () => {
  const {
    dashboard,
    isLoading,
    error,
    isForbidden,
    refresh,
    createUser,
    resetUserPassword,
    regenerateUserPin,
  } = useAdminDashboard()

  const [showNewJobModal, setShowNewJobModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [feedback, setFeedback] = useState('')

  const showFeedback = (msg) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 4000)
  }

  const handleJobCreated = (newJob) => {
    setShowNewJobModal(false)
    showFeedback(`Trabajo "${newJob.title}" creado correctamente.`)
    refresh()
  }

  const handleUserCreated = async (data) => {
    await createUser(data)
    showFeedback(`Usuario ${data.email} creado correctamente.`)
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1100px] space-y-5 pb-5">
        <PageHeader
          label="Admin"
          title="Administración"
          action={
            <WeldixButton variant="warning" size="sm" onClick={() => setShowNewJobModal(true)}>
              + Nuevo trabajo
            </WeldixButton>
          }
        />

        {loadingState({ isLoading })}
        {errorState({ isLoading, error, isForbidden, refresh })}
        {feedbackBanner({ feedback })}

        {!isLoading && dashboard && (
          <>
            <AdminChartsSection dashboard={dashboard} />

            <FichajesAdminSection operarios={dashboard.operarios} onRefresh={refresh} />

            <section className="space-y-3">
              <SectionHeader
                title="Usuarios"
                action={
                  <WeldixButton variant="success" size="sm" onClick={() => setShowUserModal(true)}>
                    + Crear usuario
                  </WeldixButton>
                }
              />
              {dashboard.users.map((user) => (
                <AdminUserRow
                  key={user.id}
                  user={user}
                  onResetPassword={resetUserPassword}
                  onRegeneratePin={regenerateUserPin}
                />
              ))}
            </section>
          </>
        )}
      </div>

      {showNewJobModal && (
        <NewJobModal onClose={() => setShowNewJobModal(false)} onCreated={handleJobCreated} />
      )}
      {showUserModal && (
        <CreateUserModal onClose={() => setShowUserModal(false)} onConfirm={handleUserCreated} />
      )}
    </AppShell>
  )
}

export default AdminDashboardPage
