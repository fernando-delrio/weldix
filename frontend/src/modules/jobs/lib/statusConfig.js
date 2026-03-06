// Estrategia de estado por clave — patrón Strategy
// En lugar de if/switch en cada componente, todo el comportamiento
// de un estado está definido aquí en un único lugar.

export const STATUS_CONFIG = {
  pendiente: {
    label: 'Pendiente',
    color: 'yellow',
    bgClass: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300',
    dotClass: 'bg-yellow-400',
    next: 'en_proceso',
    nextLabel: 'Iniciar trabajo',
  },
  en_proceso: {
    label: 'En proceso',
    color: 'blue',
    bgClass: 'bg-sky-500/15 border-sky-500/40 text-sky-300',
    dotClass: 'bg-sky-400',
    next: 'control',
    nextLabel: 'Pasar a control',
  },
  control: {
    label: 'Control calidad',
    color: 'purple',
    bgClass: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
    dotClass: 'bg-purple-400',
    next: 'listo',
    nextLabel: 'Marcar como listo',
  },
  listo: {
    label: 'Listo',
    color: 'green',
    bgClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    dotClass: 'bg-emerald-400',
    next: 'entregado',
    nextLabel: 'Marcar como entregado',
  },
  entregado: {
    label: 'Entregado',
    color: 'slate',
    bgClass: 'bg-slate-700/40 border-slate-600/40 text-slate-400',
    dotClass: 'bg-slate-500',
    next: null,
    nextLabel: null,
  },
}

// Helper: obtener config de un estado de forma segura
export function getStatusConfig(status) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.pendiente
}
