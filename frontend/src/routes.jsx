import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthSessionProvider } from './modules/auth/lib/AuthSessionProvider'
import ProtectedRoute from './modules/auth/components/ProtectedRoute'
import { useAuthSession } from './modules/auth/hooks/useAuthSession'

// Eager — críticos para el primer render
import LoginPage from './modules/auth/components/LoginPage'
import LandingPage from './modules/landing/components/LandingPage'

// Lazy — se cargan cuando el usuario navega a esa ruta
const AdminDashboardPage = lazy(() => import('./modules/admin/components/AdminDashboardPage'))
const WorkerDashboardPage = lazy(() => import('./modules/dashboard/components/WorkerDashboardPage'))
const ProfilePage = lazy(() => import('./modules/dashboard/components/ProfilePage'))
const StockPage = lazy(() => import('./modules/stock/components/StockPage'))
const JobsPage = lazy(() => import('./modules/jobs/components/JobsPage'))
const JobDetailPage = lazy(() => import('./modules/jobs/components/JobDetailPage'))
const RegisterWorkspacePage = lazy(() => import('./modules/auth/components/RegisterWorkspacePage'))
const RrhhPage = lazy(() => import('./modules/rrhh/components/RrhhPage'))
const PrivacidadPage = lazy(() => import('./modules/core/components/PrivacidadPage'))
const TerminosPage = lazy(() => import('./modules/core/components/TerminosPage'))
const TrialExpiredPage = lazy(() => import('./modules/core/components/TrialExpiredPage'))
const SuperAdminPage = lazy(() => import('./modules/superadmin/components/SuperAdminPage'))

const Splash = ({ text }) => (
  <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">
    <p className="text-sm font-semibold uppercase tracking-[0.14em]">{text}</p>
  </main>
)

const stillBootstrapping = ({ isSessionBootstrapped }) =>
  !isSessionBootstrapped && <Splash text="Iniciando..." />

const redirectByAuthState = ({ token }) => (
  <Navigate to={token ? '/app/inicio' : '/login'} replace />
)

const RootRedirect = () => {
  const session = useAuthSession()
  return stillBootstrapping(session) || redirectByAuthState(session)
}

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <AuthSessionProvider>
        <Suspense fallback={<Splash text="Cargando..." />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterWorkspacePage />} />
            <Route path="/privacidad" element={<PrivacidadPage />} />
            <Route path="/terminos" element={<TerminosPage />} />
            <Route path="/trial-expirado" element={<TrialExpiredPage />} />
            <Route path="/superadmin" element={<SuperAdminPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/app/inicio" element={<WorkerDashboardPage />} />
              <Route path="/app/trabajos" element={<JobsPage />} />
              <Route path="/app/trabajos/:id" element={<JobDetailPage />} />
              <Route path="/app/stock" element={<StockPage />} />
              <Route path="/app/admin" element={<AdminDashboardPage />} />
              <Route path="/app/rrhh" element={<RrhhPage />} />
              <Route path="/app/perfil" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </Suspense>
      </AuthSessionProvider>
    </BrowserRouter>
  )
}

export default AppRoutes
