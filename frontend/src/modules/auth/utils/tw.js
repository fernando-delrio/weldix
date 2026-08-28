export const authTw = {
  pageRoot: 'min-h-screen bg-slate-950 text-slate-100',
  twoColumnGrid: 'grid min-h-screen grid-cols-1 lg:grid-cols-2',

  heroSection:
    'relative overflow-hidden border-b border-[color:var(--card-border)] px-6 py-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-12',
  heroGlow:
    'pointer-events-none absolute inset-0 bg-[radial-gradient(760px_520px_at_12%_8%,rgba(245,158,11,0.10),transparent_60%)]',
  heroContent: 'relative z-10 flex h-full flex-col',
  logoRow: 'inline-flex items-center gap-3',
  heroCopyBox: 'my-auto max-w-[520px] pt-12',
  heroHeadline:
    "font-['Rajdhani'] text-[clamp(2.4rem,7vw,4.1rem)] font-extrabold leading-[0.95] tracking-tight text-slate-100",
  heroAccent: 'text-amber-400',
  heroParagraph: 'mt-6 max-w-[470px] text-[1rem] leading-relaxed text-slate-300',
  valueList: 'mt-8 flex flex-col gap-3',
  valueItem: 'flex items-start gap-2.5 text-sm text-slate-300',
  valueIcon: 'mt-0.5 shrink-0 text-base text-amber-400',

  panelSection:
    'grid place-items-center bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-8 sm:px-6',
  panelCard:
    'w-full max-w-[430px] rounded-2xl border border-[color:var(--card-border)] bg-[var(--card-bg)]/85 p-5 shadow-[var(--card-shadow)] backdrop-blur',
  modeSwitch: 'mb-4 grid grid-cols-2 rounded-lg border border-slate-700 bg-slate-800/70 p-1',
  modeButtonBase: 'rounded-md px-3 py-2 text-center text-sm font-semibold transition',
  modeButtonActive: 'bg-amber-500 text-black shadow-sm',
  modeButtonInactive: 'text-slate-300 hover:text-slate-100',
  panelTitle:
    "m-0 font-['Rajdhani'] text-[clamp(2rem,5.6vw,2.7rem)] font-extrabold leading-tight text-slate-100",
  panelSubtitle: 'mt-2 text-slate-400',
  feedbackBase: 'mt-3 text-sm',
  feedbackError: 'text-rose-400',
  feedbackOk: 'text-emerald-400',

  formGrid: 'mt-5 grid gap-2.5',
  fieldLabel:
    "mt-2 font-['Rajdhani'] text-[0.72rem] font-semibold tracking-[0.28em] text-slate-400",
  fieldShell:
    'flex min-h-[52px] items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/70 px-3.5 transition focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20',
  fieldIcon: 'shrink-0 text-lg text-slate-500',
  fieldInput:
    'w-full bg-transparent text-[0.98rem] text-slate-100 outline-none placeholder:text-slate-500',
  helperTextRight: 'mt-1 text-right text-[0.82rem] text-slate-500',
}

export const cx = (...classes) => classes.filter(Boolean).join(' ')
