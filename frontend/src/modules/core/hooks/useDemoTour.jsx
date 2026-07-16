import { useEffect, useRef } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

import { DEMO_TOURS } from '../lib/demoTours'

// Bandera que deja la demo al entrar (misma clave que useDemoAccess).
const TOUR_FLAG = 'weldix_demo_tour'

// Lanza el tour guiado de driver.js si la demo lo pidió para este rol.
// `ready` = el dashboard ya está cargado.
// Robusto frente a StrictMode (doble render en dev): un ref garantiza una sola
// ejecución y NO destruimos el tour en el cleanup. Además espera a que el primer
// elemento anclado exista antes de arrancar (evita globos sin destino).
export const useDemoTour = (role, ready) => {
  const startedRef = useRef(false)

  useEffect(() => {
    if (!ready || startedRef.current) return
    if (sessionStorage.getItem(TOUR_FLAG) !== role) return

    const steps = DEMO_TOURS[role]
    if (!steps || steps.length === 0) return

    const firstSelector = steps[0].element
    let attempts = 0

    const launch = () => {
      if (startedRef.current) return
      const anchorReady = !firstSelector || document.querySelector(firstSelector)
      if (!anchorReady && attempts < 25) {
        attempts += 1
        window.setTimeout(launch, 150)
        return
      }
      startedRef.current = true
      sessionStorage.removeItem(TOUR_FLAG) // que no se repita al recargar
      driver({
        showProgress: true,
        progressText: '{{current}} de {{total}}',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Atrás',
        doneBtnText: '¡Listo!',
        steps,
      }).drive()
    }

    launch()
  }, [role, ready])
}
