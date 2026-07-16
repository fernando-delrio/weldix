// Definiciones de los tours guiados de la demo.
// Cada paso apunta a un elemento por su atributo data-tour="..." y le pega un globo.
// Añadir un paso = una entrada más en el array. Cero cambios en la lógica del runner.

export const DEMO_TOURS = {
  operario: [
    {
      element: '[data-tour="op-welcome"]',
      popover: {
        title: '👋 Bienvenido a la demo',
        description:
          'Este es el panel del operario. Te enseño lo esencial en 4 pasos. Puedes salir cuando quieras.',
      },
    },
    {
      element: '[data-tour="op-fichaje"]',
      popover: {
        title: '⏱️ Fichar la jornada',
        description:
          'El operario ficha su entrada y salida desde aquí. El sistema calcula las horas exactas, sin relojes ni papel.',
      },
    },
    {
      element: '[data-tour="op-ot"]',
      popover: {
        title: '🔧 Iniciar un trabajo (OT)',
        description:
          'Introduce el código de la orden de trabajo (o escanéalo por QR) y empieza. Aquí verás siempre tu trabajo activo.',
      },
    },
    {
      element: '[data-tour="op-metrics"]',
      popover: {
        title: '📊 Tus métricas',
        description:
          'De un vistazo: trabajos pendientes, en proceso y las horas de la semana. Fin del tour, ¡explora libremente!',
      },
    },
  ],
  admin: [
    {
      element: '[data-tour="op-welcome"]',
      popover: {
        title: '👋 Bienvenido, jefe',
        description:
          'Esta es la vista de administración del taller. Te enseño dónde está cada cosa en 4 pasos.',
      },
    },
    {
      element: '[data-tour="nav-stock"]',
      popover: {
        title: '📦 Stock, albarán con IA y variantes',
        description:
          'Gestiona el material y sus variantes. Sube el albarán del proveedor y la IA lo lee y registra las entradas por ti, sin teclear.',
      },
    },
    {
      element: '[data-tour="nav-rrhh"]',
      popover: {
        title: '🧑‍🏭 RRHH',
        description:
          'Fichajes, vacaciones, ausencias, nóminas (que la IA también lee del PDF) e informes mensuales del equipo.',
      },
    },
    {
      element: '[data-tour="nav-admin"]',
      popover: {
        title: '📊 Panel de administración',
        description:
          'Métricas del taller, todos los trabajos y gestión de operarios. Fin del tour, ¡explora libremente!',
      },
    },
  ],
}
