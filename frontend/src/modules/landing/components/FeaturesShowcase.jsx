import { useState } from 'react'

import { cx } from '../../core/lib/cx'

// Escaparate de funcionalidades — lista numerada + panel de detalle (estilo explorador).
// Datos: doc/funcionalidades.md. `star` marca los diferenciadores frente a un SaaS de fichaje.
const SHOWCASE = [
  {
    icon: 'bx bx-list-check',
    title: 'Órdenes de trabajo',
    star: true,
    hook: 'Del papel al control total. Cada trabajo, su estado y su historia, en tiempo real.',
    points: [
      'Código automático ORD-YYYY-NNN y flujo de 5 estados.',
      'Historial de eventos por OT: quién cambió qué y cuándo.',
      'Vista Lista y Kanban con arrastrar y soltar.',
      'Parte de trabajo en PDF descargable.',
    ],
  },
  {
    icon: 'bx bx-time-five',
    title: 'Control horario y fichaje',
    hook: 'Cumple el RDL 8/2019 sin esfuerzo. Ficha desde donde estés.',
    points: [
      'Fichaje entrada/salida desde web, móvil o tablet.',
      'Cálculo automático de horas y cierre forzado por el admin.',
      'Horas imputadas por OT y resumen de extras.',
      'Exportación CSV lista para Inspección de Trabajo.',
    ],
  },
  {
    icon: 'bx bx-grid-alt',
    title: 'Modo Kiosko',
    star: true,
    hook: 'Una tablet en la entrada. Cada operario ficha con su PIN. Cero fricción.',
    points: [
      'Pantalla táctil con teclado grande, pensada para guantes.',
      'PIN de 4 dígitos único por taller, auto-generado.',
      'El mismo fichaje que ve en la app: entra por la tablet y el cronómetro ya corre.',
      'El admin ve y regenera los PIN desde el panel.',
    ],
  },
  {
    icon: 'bx bx-package',
    title: 'Stock + Albarán IA',
    star: true,
    hook: 'Sabes lo que tienes, lo que gastas y cuándo reponer. Sin contar a mano.',
    points: [
      'Alertas cuando un material baja del mínimo.',
      'Consumo de material por OT y recepción de pedidos con un clic.',
      'Albarán IA: sube la foto del albarán y la IA extrae los materiales.',
    ],
  },
  {
    icon: 'bx bx-link-alt',
    title: 'Portal cliente',
    star: true,
    hook: 'Tu cliente sigue su trabajo sin llamarte ni crear cuenta.',
    points: [
      'Enlace público único por orden de trabajo.',
      'Barra de progreso con los 5 estados, en tiempo real.',
      'Solo ve su trabajo: nada más del taller.',
    ],
  },
  {
    icon: 'bx bx-wrench',
    title: 'Equipos y mantenimiento (GMAO)',
    star: true,
    hook: 'Tu maquinaria, con semáforo de mantenimiento. Nada se te pasa.',
    points: [
      'Inventario con estado: operativo, en revisión, averiado, retirado.',
      'Alertas de mantenimiento vencido según el intervalo de cada equipo.',
    ],
  },
  {
    icon: 'bx bx-group',
    title: 'RRHH completo',
    hook: 'Todo el papeleo laboral del taller, en un sitio.',
    points: [
      'Vacaciones, ausencias y permisos con aprobación del jefe.',
      'Cuadrante de turnos con solicitudes de cambio.',
      'EPIs, certificados y reconocimientos médicos con alerta de caducidad.',
      'Accidentes laborales, siniestralidad e informe mensual.',
    ],
  },
  {
    icon: 'bxs bxs-file-pdf',
    title: 'Nóminas',
    hook: 'El admin las sube, el operario las descarga. Sin emails perdidos.',
    points: [
      'Subida del PDF de nómina por mes y año.',
      'Cada operario descarga solo las suyas, desde su perfil.',
    ],
  },
  {
    icon: 'bx bx-bot',
    title: 'Weldix AI',
    star: true,
    hook: 'Una IA que entiende de soldadura Y de tu taller.',
    points: [
      'Técnica: MIG/TIG, materiales, defectos, normativa (ISO 9606, EN 1090), seguridad.',
      'Gestión: responde con tus OTs, stock, mantenimiento, fichajes y nóminas reales.',
      'Consciente del rol: distinta respuesta para admin y operario.',
    ],
  },
  {
    icon: 'bx bx-camera',
    title: 'Fotos y QR por trabajo',
    star: true,
    hook: 'La prueba visual de cada trabajo y acceso sin teclear.',
    points: [
      'Galería por OT: antes, durante y después, con visor a pantalla completa.',
      'El operario abre la OT escaneando el QR del papel con la cámara.',
    ],
  },
  {
    icon: 'bx bx-bar-chart-alt-2',
    title: 'Dashboard y métricas',
    hook: 'El pulso del taller de un vistazo.',
    points: [
      'Panel admin con métricas globales y gráficos por estado, operario y mes.',
      'Dashboard del operario con su trabajo activo y sus pendientes.',
    ],
  },
  {
    icon: 'bx bx-bell',
    title: 'Avisos en tiempo real',
    star: true,
    hook: 'El taller te avisa. No al revés.',
    points: [
      'Campana con avisos en vivo: stock bajo, OT bloqueada, mantenimiento vencido.',
      'Sin recargar: llegan solos por WebSocket.',
    ],
  },
  {
    icon: 'bx bx-buildings',
    title: 'Plataforma SaaS',
    hook: 'Instálalo en la tablet, funciona sin conexión, listo en 2 minutos.',
    points: [
      'Cada taller es un espacio 100% aislado (multi-taller).',
      'App instalable (PWA) con caché offline, sin App Store.',
      'Onboarding guiado, prueba de 15 días y cumplimiento GDPR.',
    ],
  },
]

const pad2 = (n) => String(n + 1).padStart(2, '0')

const FeaturesShowcase = ({ t }) => {
  const [active, setActive] = useState(0)
  const current = SHOWCASE[active]

  const go = (delta) => setActive((i) => (i + delta + SHOWCASE.length) % SHOWCASE.length)

  return (
    <section
      id="modulos"
      className={cx('scroll-mt-24 px-6 py-24 transition-colors duration-300', t.sectionAlt)}
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={cx('text-xs font-bold uppercase tracking-[0.2em]', t.accent)}>
            Todo en una plataforma
          </p>
          <h2 className={cx('mt-3 font-display text-4xl font-extrabold sm:text-5xl', t.headline)}>
            Explora todo lo que hace Weldix
          </h2>
          <p className={cx('mx-auto mt-3 max-w-2xl text-base', t.muted)}>
            No es solo fichaje: es la gestión completa de tu taller, con {SHOWCASE.length} módulos
            conectados entre sí.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-12">
          {/* Lista lateral numerada.
              min-w-0: sin esto, al ser hijo directo de un contenedor grid,
              el navegador no lo encoge por debajo del ancho de su contenido
              (min-width:auto por defecto en grid/flex) — la fila de pestañas
              empujaba TODA la página a un ancho de ~2900px en móvil en vez
              de quedarse en su columna y dejar que su propio overflow-x-auto
              haga el scroll interno. */}
          <div
            className={cx('min-w-0 rounded-2xl border p-2 lg:col-span-4', t.card)}
            role="tablist"
            aria-label="Funcionalidades de Weldix"
          >
            <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {SHOWCASE.map((item, index) => {
                const isActive = index === active
                return (
                  <button
                    key={item.title}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActive(index)}
                    className={cx(
                      'flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition lg:w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70',
                      isActive ? cx(t.accentTint, t.accent) : cx(t.muted, 'hover:bg-white/[0.03]')
                    )}
                  >
                    <span className="font-mono text-xs opacity-70">{pad2(index)}</span>
                    <i className={cx(item.icon, 'text-lg')} aria-hidden="true" />
                    <span className="truncate">{item.title}</span>
                    {item.star && (
                      <i
                        className="bx bxs-star ml-auto hidden text-xs text-amber-400 lg:inline"
                        title="Exclusivo de Weldix"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Panel de detalle */}
          <div className={cx('rounded-2xl border p-8 lg:col-span-8', t.card)}>
            <div className="flex items-start justify-between gap-4">
              <div
                className={cx(
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl',
                  t.accentTint
                )}
              >
                <i className={cx(current.icon, 'text-3xl', t.accent)} aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => go(-1)}
                  aria-label="Funcionalidad anterior"
                  className={cx(
                    'flex h-9 w-9 items-center justify-center rounded-lg border transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70',
                    t.divider,
                    t.navText
                  )}
                >
                  <i className="bx bx-chevron-up" aria-hidden="true" />
                </button>
                <span className={cx('font-mono text-xs', t.faint)}>
                  {pad2(active)} / {pad2(SHOWCASE.length - 1)}
                </span>
                <button
                  onClick={() => go(1)}
                  aria-label="Funcionalidad siguiente"
                  className={cx(
                    'flex h-9 w-9 items-center justify-center rounded-lg border transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70',
                    t.divider,
                    t.navText
                  )}
                >
                  <i className="bx bx-chevron-down" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <h3 className={cx('font-display text-2xl font-bold', t.headline)}>{current.title}</h3>
              {current.star && (
                <span
                  className={cx(
                    'rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-widest',
                    t.pill
                  )}
                >
                  Exclusivo
                </span>
              )}
            </div>

            <p className={cx('mt-2 text-lg font-medium', t.muted)}>{current.hook}</p>

            <ul className="mt-6 space-y-3">
              {current.points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <i
                    className={cx('bx bx-check-circle mt-0.5 shrink-0 text-lg', t.accent)}
                    aria-hidden="true"
                  />
                  <span className={cx('text-sm leading-relaxed', t.muted)}>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FeaturesShowcase
