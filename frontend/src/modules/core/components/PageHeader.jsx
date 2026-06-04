const PageHeader = ({ label, title, description, action }) => (
  <div className="flex items-start justify-between gap-4 pb-1">
    <div className="min-w-0">
      {label && (
        <p className="mb-0.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-amber-400">
          {label}
        </p>
      )}
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
    {action && <div className="shrink-0 pt-0.5">{action}</div>}
  </div>
)

export default PageHeader
