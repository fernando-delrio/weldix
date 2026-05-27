const PanelCard = ({ children, className = '' }) => {
  return (
    <article
      className={`rounded-2xl border bg-slate-900 p-4 ${className}`}
      style={{ borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow)' }}
    >
      {children}
    </article>
  )
}

export default PanelCard
