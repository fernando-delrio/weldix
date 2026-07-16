import { useEffect, useState } from 'react'

import { startDemo } from '../services/demoService'

// Misma clave que usa AuthSessionProvider para leer el token al arrancar.
const TOKEN_KEY = 'weldix_access_token'
// Bandera que lee el dashboard para lanzar el tour guiado al entrar.
const TOUR_FLAG = 'weldix_demo_tour'

// Orquesta la entrada a la demo: pide token, lo guarda y entra a la app.
// Si no hay rol, no hace nada (la página muestra el selector).
// try/catch vive aquí (en el hook), nunca en el componente ni en el service.
export const useDemoAccess = (rol) => {
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!rol) return undefined
    let active = true
    startDemo(rol)
      .then((data) => {
        localStorage.setItem(TOKEN_KEY, data.access_token)
        sessionStorage.setItem(TOUR_FLAG, rol)
        // Recarga completa: AuthSessionProvider rebootstrapea la sesión con /auth/me.
        window.location.assign('/app/inicio')
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [rol])

  return { error }
}
