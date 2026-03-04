import { mapOperarioDashboardModel } from '../lib/operarioDashboardModel'

const MOCK_DELAY_MS = 260

function buildDateLabel() {
  const now = new Date()
  const formatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(now)

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function buildMockRawDashboard() {
  return {
    greeting: {
      greetingLabel: 'Buenos dias',
      operatorName: 'Javier Martin',
      dateLabel: buildDateLabel(),
      shiftLabel: 'Turno manana',
    },
    metrics: [
      { key: 'pending', label: 'Pendientes', value: 2, tone: 'warning' },
      { key: 'in_progress', label: 'En proceso', value: 1, tone: 'info' },
      { key: 'week', label: 'Esta semana', value: 4, tone: 'success' },
    ],
    activeJob: {
      id: 'ORD-2024-087',
      status: 'En proceso',
      statusTone: 'info',
      dueLabel: 'Entrega hoy',
      dueTone: 'danger',
      title: 'Estructura metalica nave industrial',
      client: 'Construcciones Lopez S.L.',
      progress: 65,
      stages: ['Inicio', 'Proceso', 'Control', 'Listo', 'Entregado'],
      currentStage: 1,
    },
    todayJobs: [
      {
        id: 'ORD-2024-089',
        title: 'Escalera acero inoxidable',
        area: 'Soldadura fina',
        due: 'Entrega: 21 Feb',
        status: 'Pendiente',
        tone: 'warning',
      },
      {
        id: 'ORD-2024-085',
        title: 'Deposito agua 5000L',
        area: 'Agro Hermanos Perez',
        due: 'Entrega: 20 Feb',
        status: 'Control',
        tone: 'secondary',
      },
    ],
    stock: [
      {
        id: 'wire-32',
        name: 'Varilla soldadura 3.2mm',
        stockLabel: 'Stock: 12 ud',
        minimumLabel: 'Minimo: 50 ud',
        level: 18,
        tone: 'danger',
      },
      {
        id: 'sheet-3',
        name: 'Chapa acero 3mm',
        stockLabel: 'Stock: 36 kg',
        minimumLabel: 'Minimo: 10 kg',
        level: 72,
        tone: 'success',
      },
    ],
  }
}

export async function getOperarioDashboard() {
  await new Promise((resolve) => window.setTimeout(resolve, MOCK_DELAY_MS))
  return mapOperarioDashboardModel(buildMockRawDashboard())
}
