export const toneClasses = {
  warning: {
    badge: 'border-amber-500/35 bg-amber-500/12 text-amber-300',
    metricAccent: 'text-amber-300',
    metricBorder: 'border-amber-500/30',
    stockBar: 'bg-amber-400',
  },
  info: {
    badge: 'border-sky-500/35 bg-sky-500/12 text-sky-300',
    metricAccent: 'text-sky-300',
    metricBorder: 'border-sky-500/35',
    stockBar: 'bg-sky-400',
  },
  success: {
    badge: 'border-emerald-500/35 bg-emerald-500/12 text-emerald-300',
    metricAccent: 'text-emerald-300',
    metricBorder: 'border-emerald-500/35',
    stockBar: 'bg-emerald-400',
  },
  secondary: {
    badge: 'border-violet-500/35 bg-violet-500/12 text-violet-300',
    metricAccent: 'text-violet-300',
    metricBorder: 'border-violet-500/35',
    stockBar: 'bg-violet-400',
  },
  danger: {
    badge: 'border-rose-500/35 bg-rose-500/12 text-rose-300',
    metricAccent: 'text-rose-300',
    metricBorder: 'border-rose-500/35',
    stockBar: 'bg-rose-400',
  },
  neutral: {
    badge: 'border-slate-500/35 bg-slate-500/12 text-slate-300',
    metricAccent: 'text-slate-300',
    metricBorder: 'border-slate-600',
    stockBar: 'bg-slate-400',
  },
}

export function toneFor(key) {
  return toneClasses[key] || toneClasses.neutral
}
