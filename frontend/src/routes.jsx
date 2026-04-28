import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthSessionProvider } from './modules/auth/lib/AuthSessionProvider'
import ProtectedRoute from './modules/auth/components/ProtectedRoute'
import { useAuthSession } from './modules/auth/hooks/useAuthSession'
import AdminDashboardPage from './modules/admin/components/AdminDashboardPage'
import WorkerDashboardPage from './modules/dashboard/components/WorkerDashboardPage'
import ProfilePage from './modules/dashboard/components/ProfilePage'
import StockPage from './modules/stock/components/StockPage'
import EquiposPage from './modules/equipos/components/EquiposPage'
import JobsPage from './modules/jobs/components/JobsPage'
import JobDetailPage from './modules/jobs/components/JobDetailPage'
import LoginPage from './modules/auth/components/LoginPage'
import RegisterWorkspacePage from './modules/auth/components/RegisterWorkspacePage'
import RrhhPage from './modules/rrhh/components/RrhhPage'
import PrivacidadPage from './modules/core/components/PrivacidadPage'
import TerminosPage from './modules/core/components/TerminosPage'
import LandingPage from './modules/landing/components/LandingPage'
import TrialExpiredPage from './modules/core/components/TrialExpiredPage'

const Splash = ({ text }) => (
  <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">
    <p className="text-sm font-semibold uppercase tracking-[0.14em]">{text}</p>
  </main>
)

const stillBootstrapping = ({ isSessionBootstrapped }) =>
  !isSessionBootstrapped && <Splash text="Iniciando..." />

const redirectByAuthState = ({ token }) =>
  <Navigate to={token ? '/app/inicio' : '/login'} replace />

const RootRedirect = () => {
  const session = useAuthSession()
  return stillBootstrapping(session) || redirectByAuthState(session)
}

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <AuthSessionProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterWorkspacePage />} />
          <Route path="/privacidad" element={<PrivacidadPage />} />
          <Route path="/terminos" element={<TerminosPage />} />
          <Route path="/trial-expirado" element={<TrialExpiredPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/app/inicio" element={<WorkerDashboardPage />} />
            <Route path="/app/trabajos" element={<JobsPage />} />
            <Route path="/app/trabajos/:id" element={<JobDetailPage />} />
            <Route path="/app/stock" element={<StockPage />} />
            <Route path="/app/equipos" element={<EquiposPage />} />
            <Route path="/app/admin" element={<AdminDashboardPage />} />
            <Route path="/app/rrhh" element={<RrhhPage />} />
            <Route path="/app/perfil" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthSessionProvider>
    </BrowserRouter>
  )
}

export default AppRoutes
