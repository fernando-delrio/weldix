const PanelCard = ({ children, className = '' }) => {
  return (
    <article
      className={`rounded-xl border bg-[var(--card-bg)] p-4 ${className}`}
      style={{ borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow)' }}
    >
      {children}
    </article>
  )
}

export default PanelCard
