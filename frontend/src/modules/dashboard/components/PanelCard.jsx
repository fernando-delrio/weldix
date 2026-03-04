function PanelCard({ children, className = '' }) {
  return (
    <article
      className={`rounded-2xl border border-cyan-900/60 bg-slate-900/75 p-4 shadow-[0_16px_40px_rgba(2,6,23,0.45)] ${className}`}
    >
      {children}
    </article>
  )
}

export default PanelCard
