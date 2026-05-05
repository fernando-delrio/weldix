import { useState } from 'react'

import AppShell from '../../core/components/AppShell'
import PanelCard from '../../dashboard/components/PanelCard'
import NewJobModal from '../../dashboard/components/NewJobModal'
import FichajesAdminSection from '../../fichaje/components/FichajesAdminSection'
import { useAdminDashboard } from '../hooks/useAdminDashboard'
import AdminUserRow from './AdminUserRow'
import CreateUserModal from './CreateUserModal'

// ── Guards de estado ─────────────────────────────────────────────────────────
const loadingState = ({ isLoading }) =>
  isLoading && (
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

const feedbackBanner = ({ feedback }) =>
  feedback && (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
      <p className="text-sm font-semibold text-emerald-300">{feedback}</p>
    </div>
  )

// ── Sección usuarios ─────────────────────────────────────────────────────────
const sectionHeader = ({ title, action }) => (
  <div className="flex items-center justify-between">
    <p className="text-[0.64rem] font-bold uppercase tracking-[0.2em] text-amber-300">{title}</p>
    {action}
  </div>
)

const newUserButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="shrink-0 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3 py-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-emerald-300 transition hover:border-emerald-400/70 hover:bg-emerald-500/25"
  >
    + Crear usuario
  </button>
)

// ── Componente principal ─────────────────────────────────────────────────────
const AdminDashboardPage = () => {
  const { dashboard, isLoading, error, refresh, createUser } = useAdminDashboard()

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
        {/* Cabecera */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.2em] text-rose-300">
              Panel
            </p>
            <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-slate-100">
              Administración
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setShowNewJobModal(true)}
            className="shrink-0 rounded-xl border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-amber-300 transition hover:border-amber-400/70 hover:bg-amber-500/25"
          >
            + Nuevo trabajo
          </button>
        </div>

        {loadingState({ isLoading })}
        {errorState({ isLoading, error, refresh })}
        {feedbackBanner({ feedback })}

        {!isLoading && dashboard && (
          <>
            <FichajesAdminSection operarios={dashboard.operarios} onRefresh={refresh} />

            <section className="space-y-3">
              {sectionHeader({
                title: 'Usuarios',
                action: newUserButton({ onClick: () => setShowUserModal(true) }),
              })}
              {dashboard.users.map((user) => (
                <AdminUserRow key={user.id} user={user} />
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
