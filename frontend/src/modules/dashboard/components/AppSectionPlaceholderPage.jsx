import AppShell from '../../core/components/AppShell'
import PageHeader from '../../core/components/PageHeader'
import PanelCard from '../../core/components/PanelCard'

const AppSectionPlaceholderPage = ({ title, description }) => {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[680px] space-y-3 pb-5">
        <PageHeader label="Módulo" title={title} />
        <PanelCard>
          <p className="text-sm text-slate-400">{description}</p>
        </PanelCard>
      </div>
    </AppShell>
  )
}

export default AppSectionPlaceholderPage
