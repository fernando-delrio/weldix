import { useMemo } from 'react'

import { useAuthSession } from '../../auth/useAuthSession'
import { useClock } from '../../hooks/useClock'
import AppHeader from './AppHeader'
import BottomNav from './BottomNav'
import { APP_SHELL_NAV_ITEMS } from './navigation'

function getUserInitials(profile) {
  const rawName = profile?.full_name?.trim()
  if (rawName) {
    const parts = rawName.split(/\s+/).slice(0, 2)
    return parts.map((part) => part[0]).join('').toUpperCase()
  }

  const rawEmail = profile?.email || ''
  return rawEmail.slice(0, 2).toUpperCase() || 'WD'
}

function AppShell({ children }) {
  const { profile, clearSession } = useAuthSession()
  const timeLabel = useClock()

  const roleLabel = (profile?.role || 'operario').toUpperCase()
  const userInitials = useMemo(() => getUserInitials(profile), [profile])

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(3,38,66,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(3,38,66,0.45)_1px,transparent_1px)] [background-size:30px_30px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_430px_at_50%_0%,rgba(14,165,233,0.18),transparent_68%)]" />

      <AppHeader
        roleLabel={roleLabel}
        timeLabel={timeLabel}
        userInitials={userInitials}
        onLogout={clearSession}
      />

      <main className="relative mx-auto w-full max-w-[980px] px-4 pb-[98px] pt-[82px] sm:px-6">
        {children}
      </main>

      <BottomNav items={APP_SHELL_NAV_ITEMS} />
    </div>
  )
}

export default AppShell
