import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthSessionProvider } from './auth/AuthSessionProvider'
import ProtectedRoute from './auth/ProtectedRoute'
import { useAuthSession } from './auth/useAuthSession'
import OperarioDashboardPage from './pages/app/OperarioDashboardPage'
import PerfilPage from './pages/app/PerfilPage'
import StockPage from './pages/app/StockPage'
import TrabajosPage from './pages/app/TrabajosPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

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
