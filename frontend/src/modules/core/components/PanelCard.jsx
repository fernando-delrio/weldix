const PanelCard = ({ children, className = '' }) => {
  return (
    <article
      className={`rounded-2xl border border-white/[0.06] bg-slate-900 p-4 shadow-[0_16px_40px_rgba(2,6,23,0.45),inset_0_1px_0_rgba(255,255,255,0.04)] ${className}`}
    >
      {children}
    </article>
  )
}

export default PanelCard
