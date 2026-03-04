import AppShell from '../../core/components/AppShell'
import PanelCard from './PanelCard'

function AppSectionPlaceholderPage({ title, description }) {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[680px] space-y-3 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">Modulo</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-100">{title}</h1>
        <PanelCard>
          <p className="text-sm text-slate-300">{description}</p>
        </PanelCard>
      </div>
    </AppShell>
  )
}

export default AppSectionPlaceholderPage
