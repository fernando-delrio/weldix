export const authTw = {
  pageRoot: 'min-h-screen bg-slate-950 text-slate-100',
  twoColumnGrid: 'grid min-h-screen grid-cols-1 lg:grid-cols-2',

  heroSection:
    'relative overflow-hidden border-b border-[color:var(--card-border)] px-6 py-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-12',
  heroGlow:
    'pointer-events-none absolute inset-0 bg-[radial-gradient(760px_520px_at_12%_8%,rgba(245,158,11,0.10),transparent_60%)]',
  heroContent: 'relative z-10 flex h-full flex-col',
  logoRow: 'inline-flex items-center gap-3',
  logoBadge:
    'grid h-11 w-11 place-items-center rounded-lg border border-amber-700/60 bg-amber-900/30 text-lg font-bold text-amber-300',
  brandTitle: "m-0 font-['Rajdhani'] text-3xl font-extrabold tracking-wide text-amber-400",
  brandSubtitle: 'mt-[-0.15rem] text-[0.68rem] tracking-[0.33em] text-slate-400',
  heroCopyBox: 'my-auto max-w-[520px] pt-12',
  heroHeadline:
    "font-['Rajdhani'] text-[clamp(2.4rem,7vw,4.1rem)] font-extrabold leading-[0.95] tracking-tight text-slate-100",
  heroAccent: 'text-amber-400',
  heroParagraph: 'mt-6 max-w-[470px] text-[1rem] leading-relaxed text-slate-300',
  metricRow: 'flex gap-7 pt-5',
  metricValue: "block font-['Rajdhani'] text-[2rem] font-bold text-amber-300",
  metricLabel: 'text-[0.66rem] tracking-[0.16em] text-slate-400',

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

  sessionBox: 'mt-4 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-3',
  sessionText: 'my-1 text-[0.82rem] text-slate-400',
  logoutButton:
    'mt-2 bg-transparent p-0 text-[0.8rem] text-emerald-400 disabled:cursor-not-allowed disabled:text-slate-600',
  footerRow: 'mt-4 flex items-center justify-between',
  footerVersion: 'text-[0.72rem] tracking-[0.18em] text-slate-500',
  footerStatus: 'inline-flex items-center gap-1.5 text-[0.78rem] text-slate-400',
  footerDot: 'h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]',

  formGrid: 'mt-5 grid gap-2.5',
  fieldLabel:
    "mt-2 font-['Rajdhani'] text-[0.72rem] font-semibold tracking-[0.28em] text-slate-400",
  fieldShell:
    'flex min-h-[52px] items-center rounded-lg border border-slate-700 bg-slate-900/70 transition focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20',
  fieldIcon: 'w-11 text-center text-slate-500',
  fieldInput:
    'w-full bg-transparent pr-3.5 text-[0.98rem] text-slate-100 outline-none placeholder:text-slate-500',
  helperTextRight: 'mt-1 text-right text-[0.82rem] text-slate-500',
  primaryButton:
    "mt-1 h-[52px] rounded-lg bg-gradient-to-r bg-amber-500 font-['Rajdhani'] text-base font-bold text-white shadow-lg shadow-amber-900/30 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300",
  primaryButtonWideTracking: 'tracking-[0.16em]',
  primaryButtonMediumTracking: 'tracking-[0.12em]',

  roleDivider:
    'relative my-5 text-center before:absolute before:left-0 before:top-1/2 before:w-[34%] before:border-t before:border-slate-700 after:absolute after:right-0 after:top-1/2 after:w-[34%] after:border-t after:border-slate-700',
  roleDividerText: 'relative bg-slate-900 px-3 text-[0.73rem] tracking-[0.2em] text-slate-500',
  roleGrid: 'grid grid-cols-2 gap-3',
  roleButtonBase:
    'grid justify-items-center gap-1.5 rounded-lg border px-2 py-3.5 text-sm font-semibold tracking-[0.08em] transition',
  roleButtonActive:
    'border-amber-500/70 bg-slate-800 text-slate-100 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.35)]',
  roleButtonInactive: 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500',
  roleIcon:
    'grid h-8 w-8 place-items-center rounded-full bg-slate-700 text-xs font-bold text-slate-100',

  registerRoleCardBase: 'rounded-lg border px-3 py-3 text-left transition',
  registerRoleCardActive:
    'border-amber-500/70 bg-slate-800 text-slate-100 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.35)]',
  registerRoleCardInactive:
    'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500',
  registerRoleTitle: 'text-sm font-semibold',
  registerRoleHelper: 'mt-1 text-xs text-slate-400',
  registerWarning:
    'mt-1 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-200',
}

export const cx = (...classes) => classes.filter(Boolean).join(' ')
