import { createContext } from 'react'

// Contexto global de sesion de autenticacion.
// Provisto por AuthSessionProvider — consumido a traves del hook useAuthSession.
export const AuthSessionContext = createContext(null)
