import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuthSession } from './useAuthSession'

function ProtectedRoute() {
  const { token, profile, isFetchingProfile, isSessionBootstrapped } = useAuthSession()
  const location = useLocation()

  if (!isSessionBootstrapped) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">
        <p className="text-sm font-semibold uppercase tracking-[0.14em]">Validando sesion...</p>
      </main>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (isFetchingProfile || !profile) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">
        <p className="text-sm font-semibold uppercase tracking-[0.14em]">Cargando perfil...</p>
      </main>
    )
  }

  return <Outlet />
}

export default ProtectedRoute
