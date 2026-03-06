import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthSessionProvider } from './modules/auth/lib/AuthSessionProvider'
import ProtectedRoute from './modules/auth/components/ProtectedRoute'
import { useAuthSession } from './modules/auth/hooks/useAuthSession'
import WorkerDashboardPage from './modules/dashboard/components/WorkerDashboardPage'
import ProfilePage from './modules/dashboard/components/ProfilePage'
import StockPage from './modules/dashboard/components/StockPage'
import JobsPage from './modules/jobs/components/JobsPage'
import LoginPage from './modules/auth/components/LoginPage'
import RegisterPage from './modules/auth/components/RegisterPage'

const Splash = ({ text }) => (
  <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">
    <p className="text-sm font-semibold uppercase tracking-[0.14em]">{text}</p>
  </main>
)

const stillBootstrapping = ({ isSessionBootstrapped }) =>
  !isSessionBootstrapped && <Splash text="Iniciando..." />

const redirectByAuthState = ({ token }) =>
  <Navigate to={token ? '/app/inicio' : '/login'} replace />

function RootRedirect() {
  const session = useAuthSession()
  return stillBootstrapping(session) || redirectByAuthState(session)
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthSessionProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/app/inicio" element={<WorkerDashboardPage />} />
            <Route path="/app/trabajos" element={<JobsPage />} />
            <Route path="/app/stock" element={<StockPage />} />
            <Route path="/app/perfil" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthSessionProvider>
    </BrowserRouter>
  )
}

export default AppRoutes
