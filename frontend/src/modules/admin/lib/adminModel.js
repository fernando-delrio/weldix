const TONE_CLASSES = {
  warning:   { bg: 'bg-yellow-500/15 border-yellow-500/40', text: 'text-yellow-300' },
  info:      { bg: 'bg-sky-500/15 border-sky-500/40',       text: 'text-sky-300' },
  secondary: { bg: 'bg-purple-500/15 border-purple-500/40', text: 'text-purple-300' },
  success:   { bg: 'bg-emerald-500/15 border-emerald-500/40', text: 'text-emerald-300' },
  neutral:   { bg: 'bg-slate-700/40 border-slate-600/40',   text: 'text-slate-400' },
}

const ESTADO_LABELS = {
  pendiente:  'Pendiente',
  en_proceso: 'En proceso',
  control:    'Control',
  listo:      'Listo',
  entregado:  'Entregado',
}

const ROLE_CONFIG = {
  admin:    { label: 'Admin',    classes: 'bg-rose-500/15 border-rose-500/40 text-rose-300' },
  operario: { label: 'Operario', classes: 'bg-sky-500/15 border-sky-500/40 text-sky-300' },
}

const toneClasses = (tone) => TONE_CLASSES[tone] ?? TONE_CLASSES.neutral
const roleConfig  = (role)  => ROLE_CONFIG[role]  ?? ROLE_CONFIG.operario

const mapJob  = (job)  => ({ ...job,  estadoLabel: ESTADO_LABELS[job.estado] ?? job.estado, toneClasses: toneClasses(job.tone) })
const mapUser = (user) => ({ ...user, roleConfig: roleConfig(user.role) })
const sortUsers = (users) => [...users].sort((a, b) => (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '', 'es'))

export const mapAdminDashboard = (data) => ({
  metrics:   data.metrics,
  jobs:      data.jobs.map(mapJob),
  users:     sortUsers(data.users.map(mapUser)),
  operarios: sortUsers(data.users.filter((u) => u.role === 'operario').map(mapUser)),
})
