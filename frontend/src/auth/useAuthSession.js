import { useContext } from 'react'

import { AuthSessionContext } from './AuthSessionContext'

export function useAuthSession() {
  const context = useContext(AuthSessionContext)

  if (!context) {
    throw new Error('useAuthSession debe usarse dentro de AuthSessionProvider')
  }

  return context
}
