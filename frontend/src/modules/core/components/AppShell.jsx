import { useState } from 'react'

import IaChatPanel from '../../ia/components/IaChatPanel'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { useClock } from '../hooks/useClock'
import AppHeader from './AppHeader'
import BottomNav from './BottomNav'
import { APP_SHELL_NAV_ITEMS } from '../lib/navigation'

const IaFab = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="fixed bottom-[88px] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-sky-500/40 bg-sky-500/20 text-xl shadow-lg backdrop-blur transition hover:border-sky-400/70 hover:bg-sky-500/30 sm:bottom-6 sm:right-6"
    title="Asistente IA"
  >
    🔧
  </button>
)

const AppShell = ({ children }) => {
  const { profile, clearSession } = useAuthSession()
  const timeLabel = useClock()
  const [showIa, setShowIa] = useState(false)

  const roleLabel = (profile?.role || 'operario').toUpperCase()

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(3,38,66,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(3,38,66,0.45)_1px,transparent_1px)] [background-size:30px_30px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_430px_at_50%_0%,rgba(14,165,233,0.18),transparent_68%)]" />

      <AppHeader
        roleLabel={roleLabel}
        timeLabel={timeLabel}
        onLogout={clearSession}
      />

      <main className="relative mx-auto w-full max-w-[980px] px-4 pb-[98px] pt-[82px] sm:px-6">
        {children}
      </main>

      <BottomNav items={APP_SHELL_NAV_ITEMS} />

      <IaFab onClick={() => setShowIa(true)} />
      {showIa && <IaChatPanel onClose={() => setShowIa(false)} />}
    </div>
  )
}

export default AppShell
