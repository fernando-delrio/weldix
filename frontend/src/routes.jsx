import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthSessionProvider } from './modules/auth/lib/AuthSessionProvider'
import ProtectedRoute from './modules/auth/components/ProtectedRoute'
import { useAuthSession } from './modules/auth/hooks/useAuthSession'
import OperarioDashboardPage from './modules/dashboard/components/OperarioDashboardPage'
import PerfilPage from './modules/dashboard/components/PerfilPage'
import StockPage from './modules/dashboard/components/StockPage'
import TrabajosPage from './modules/dashboard/components/TrabajosPage'
import LoginPage from './modules/auth/components/LoginPage'
import RegisterPage from './modules/auth/components/RegisterPage'

function RootRedirect() {
  const { token, isSessionBootstrapped } = useAuthSession()

  if (!isSessionBootstrapped) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">
        <p className="text-sm font-semibold uppercase tracking-[0.14em]">Iniciando...</p>
      </main>
    )
  }

  return <Navigate to={token ? '/app/inicio' : '/login'} replace />
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
            <Route path="/app/inicio" element={<OperarioDashboardPage />} />
            <Route path="/app/trabajos" element={<TrabajosPage />} />
            <Route path="/app/stock" element={<StockPage />} />
            <Route path="/app/perfil" element={<PerfilPage />} />
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthSessionProvider>
    </BrowserRouter>
  )
}

export default AppRoutes
