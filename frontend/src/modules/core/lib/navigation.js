// Entradas del menu de navegacion principal de la app
// icon: siglas de 2 letras usadas como icono de texto mientras no haya SVGs

const NAV_ITEMS_OPERARIO = [
  { key: 'inicio', label: 'Inicio', to: '/app/inicio', icon: 'IN' },
  { key: 'trabajos', label: 'Trabajos', to: '/app/trabajos', icon: 'TB' },
  { key: 'stock', label: 'Stock', to: '/app/stock', icon: 'ST' },
  { key: 'rrhh', label: 'RRHH', to: '/app/rrhh', icon: 'RH' },
  { key: 'perfil', label: 'Perfil', to: '/app/perfil', icon: 'PF' },
]

const NAV_ITEMS_ADMIN = [
  { key: 'inicio', label: 'Inicio', to: '/app/inicio', icon: 'IN' },
  { key: 'trabajos', label: 'Trabajos', to: '/app/trabajos', icon: 'TB' },
  { key: 'stock', label: 'Stock', to: '/app/stock', icon: 'ST' },
  { key: 'rrhh', label: 'RRHH', to: '/app/rrhh', icon: 'RH' },
  { key: 'admin', label: 'Admin', to: '/app/admin', icon: 'AD' },
  { key: 'perfil', label: 'Perfil', to: '/app/perfil', icon: 'PF' },
]

export const getNavItems = (role) => (role === 'admin' ? NAV_ITEMS_ADMIN : NAV_ITEMS_OPERARIO)

// Compatibilidad con importaciones existentes
export const APP_SHELL_NAV_ITEMS = NAV_ITEMS_OPERARIO
