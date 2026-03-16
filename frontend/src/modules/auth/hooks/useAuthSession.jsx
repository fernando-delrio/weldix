import { useContext } from 'react'

import { AuthSessionContext } from '../lib/AuthSessionContext'

const assertInsideAuthProvider = (context) => {
  if (!context) throw new Error('useAuthSession debe usarse dentro de <AuthSessionProvider>')
}

export const useAuthSession = () => {
  const context = useContext(AuthSessionContext)
  assertInsideAuthProvider(context)
  return context
}
