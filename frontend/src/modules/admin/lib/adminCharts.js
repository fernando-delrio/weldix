const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

const ESTADO_COLORS = {
  pendiente: '#f59e0b',
  en_proceso: '#38bdf8',
  control: '#a78bfa',
  listo: '#34d399',
  entregado: '#94a3b8',
}

export const buildEstadoData = (metrics) =>
  [
    { name: 'Pendiente', value: metrics.pendiente, color: ESTADO_COLORS.pendiente },
    { name: 'En proceso', value: metrics.en_proceso, color: ESTADO_COLORS.en_proceso },
    { name: 'Control', value: metrics.control, color: ESTADO_COLORS.control },
    { name: 'Listo', value: metrics.listo, color: ESTADO_COLORS.listo },
    { name: 'Entregado', value: metrics.entregado, color: ESTADO_COLORS.entregado },
  ].filter((d) => d.value > 0)

export const buildCargaOperarioData = (users) =>
  users
    .filter((u) => u.role === 'operario')
    .map((u) => ({
      name: (u.full_name || u.email || '').split(' ')[0],
      value: u.active_jobs_count,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

export const buildPorMesData = (jobs) => {
  const now = new Date()

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { key, label: MESES_CORTOS[d.getMonth()], total: 0 }
  })

  const monthIndex = Object.fromEntries(months.map((m, i) => [m.key, i]))

  jobs.forEach((job) => {
    const raw = job.created_at
    if (!raw) return
    const d = new Date(raw)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in monthIndex) months[monthIndex[key]].total += 1
  })

  return months
}
