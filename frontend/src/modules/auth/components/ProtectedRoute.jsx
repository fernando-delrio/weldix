import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuthSession } from '../hooks/useAuthSession'

const Splash = ({ text }) => (
  <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">
    <p className="text-sm font-semibold uppercase tracking-[0.14em]">{text}</p>
  </main>
)

const bootstrapping = ({ isSessionBootstrapped }) =>
  !isSessionBootstrapped && <Splash text="Validando sesion..." />

const unauthenticated = ({ token }, location) =>
  !token && <Navigate to="/login" replace state={{ from: location }} />

const loadingProfile = ({ isFetchingProfile, profile }) =>
  (isFetchingProfile || !profile) && <Splash text="Cargando perfil..." />

function ProtectedRoute() {
  const session = useAuthSession()
  const location = useLocation()

  return (
    bootstrapping(session) ||
    unauthenticated(session, location) ||
    loadingProfile(session) ||
    <Outlet />
  )
}

export default ProtectedRoute
