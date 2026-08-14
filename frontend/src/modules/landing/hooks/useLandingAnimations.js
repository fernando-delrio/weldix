/**
 * useLandingAnimations - orquesta GSAP ScrollTrigger para la landing de Weldix.
 *
 * Por que GSAP y no Framer Motion:
 *   Framer Motion anima props de React (re-renders). GSAP manipula el DOM
 *   directamente con RAF sin re-renders, 60fps en tablets de taller.
 *
 * Por que un hook separado:
 *   SOC - el componente pinta, el hook orquesta. La animacion no contamina el JSX.
 *
 * Por que cada animate* comprueba su propio selector antes de animar:
 *   Este hook lo llaman varias paginas (Home, FuncionalidadesPage,
 *   ComoFuncionaPage, PreciosPage...) y cada una monta solo un subconjunto de
 *   secciones. Sin el guard, GSAP intenta animar selectores que no existen en
 *   la pagina actual y llena la consola de "target not found" en cada visita.
 *
 * Cleanup obligatorio:
 *   ctx.revert() mata todos los ScrollTriggers del contexto.
 *   Sin esto hay memory leaks y animaciones fantasma en HMR de dev.
 */
import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const existsInDom = (selector) => document.querySelector(selector) !== null

// ---- Hero: badge y hero-line gestionados por Framer Motion (WordReveal) ----
// Solo animamos los elementos que NO tienen Framer Motion:
//   hero-bar, hero-sub, hero-cta, hero-stats, hero-mockup.
// Delay de 0.85s → el WordReveal (3 líneas, ~1.3s) ya tiene 2/3 completados
// cuando la barra decorativa aparece, encadenando ambas librerías sin conflicto.

const animateHero = () => {
  if (!existsInDom('[data-gsap="hero-section"]')) return

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

  // Linea decorativa amber — espera al word reveal parcial
  tl.from(
    '[data-gsap="hero-bar"]',
    { scaleX: 0, transformOrigin: 'left center', duration: 0.5, ease: 'power2.out' },
    0.85
  )

  // Subtitulo
  tl.from('[data-gsap="hero-sub"]', { y: 20, opacity: 0, duration: 0.5 }, '-=0.2')

  // Botones CTA
  tl.from('[data-gsap="hero-cta"]', { y: 15, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.25')

  // Stats grid
  tl.from('[data-gsap="hero-stats"]', { opacity: 0, duration: 0.4 }, '-=0.2')

  // Mockup entra desde la derecha en paralelo al word reveal
  tl.from(
    '[data-gsap="hero-mockup"]',
    { x: 60, opacity: 0, duration: 0.9, ease: 'power3.out' },
    0.4
  )

  return tl
}

// Parallax eliminado — scrub:true aplicaba transforms que rompían
// el position:fixed del navbar en todos los navegadores.

// ---- Pain points: stagger de tarjetas --------------------------------------

const animatePainCards = () => {
  if (!existsInDom('[data-gsap="pain-card"]')) return

  ScrollTrigger.batch('[data-gsap="pain-card"]', {
    onEnter: (els) => {
      gsap.from(els, {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
      })
    },
    once: true,
    start: 'top 85%',
  })
}

// ---- Trust metrics: scale bounce al entrar ---------------------------------

const animateTrustMetrics = () => {
  if (!existsInDom('[data-gsap="trust-item"]')) return

  ScrollTrigger.batch('[data-gsap="trust-item"]', {
    onEnter: (els) => {
      gsap.from(els, {
        scale: 0.85,
        opacity: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: 'back.out(1.5)',
      })
    },
    once: true,
    start: 'top 88%',
  })
}

// ---- Features: anima todas las tarjetas juntas cuando la sección entra -----
// Usamos gsap.from sobre el selector completo (no batch) para garantizar que
// todas las tarjetas —incluso las de la columna derecha— parten de opacity:0
// y llegan a su estado natural. clearProps elimina los estilos inline de GSAP
// tras la animación para que el hover funcione correctamente.
// Solo vive en FuncionalidadesPage (FeaturesShowcase.jsx, id="modulos").

const animateFeatures = () => {
  if (!existsInDom('[data-gsap="feature-card"]') || !existsInDom('#modulos')) return

  gsap.from('[data-gsap="feature-card"]', {
    y: 40,
    opacity: 0,
    duration: 0.6,
    stagger: 0.05,
    ease: 'power3.out',
    clearProps: 'all',
    scrollTrigger: {
      trigger: '#modulos',
      start: 'top 78%',
      once: true,
    },
  })
}

// ---- Timeline (Como funciona): la linea se dibuja al hacer scroll ----------
//
// Apple-style: el usuario ve literalmente como avanza el proceso
// mientras baja por la pagina.

const animateTimeline = () => {
  if (!existsInDom('[data-gsap="timeline-section"]')) return

  // La línea de progreso entra de golpe al scroll (sin scrub para no romper fixed)
  gsap.from('[data-gsap="timeline-progress"]', {
    scaleX: 0,
    transformOrigin: 'left center',
    duration: 1.2,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '[data-gsap="timeline-section"]',
      start: 'top 60%',
      once: true,
    },
  })

  ScrollTrigger.batch('[data-gsap="timeline-step"]', {
    onEnter: (els) => {
      gsap.from(els, {
        y: 25,
        opacity: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: 'power3.out',
      })
    },
    once: true,
    start: 'top 75%',
  })
}

// ---- Pricing ---------------------------------------------------------------

const animatePricing = () => {
  if (!existsInDom('[data-gsap="plan-card"]')) return

  ScrollTrigger.batch('[data-gsap="plan-card"]', {
    onEnter: (els) => {
      gsap.from(els, {
        y: 40,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: 'power3.out',
      })
    },
    once: true,
    start: 'top 82%',
  })
}

// ---- CTA final: glow pulsante amber (el cierre tiene que impactar) ---------
//
// Cuando el usuario llega al CTA final ya ha visto toda la propuesta.
// El glow llama la atencion sin ser molesto: 3 pulsos y se detiene.

const animateCtaFinal = () => {
  if (!existsInDom('[data-gsap="cta-section"]')) return

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '[data-gsap="cta-section"]',
      start: 'top 65%',
      once: true,
    },
  })

  tl.from('[data-gsap="cta-headline"]', {
    y: 40,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
  }).from(
    '[data-gsap="cta-sub"]',
    {
      y: 20,
      opacity: 0,
      duration: 0.5,
    },
    '-=0.4'
  )

  gsap.fromTo(
    '[data-gsap="cta-primary"]',
    { boxShadow: '0 0 0 0 rgba(245,158,11,0)' },
    {
      boxShadow: '0 0 32px 8px rgba(245,158,11,0.35)',
      duration: 0.7,
      yoyo: true,
      repeat: 3,
      ease: 'power2.inOut',
      delay: 0.8,
      scrollTrigger: {
        trigger: '[data-gsap="cta-section"]',
        start: 'top 65%',
        once: true,
      },
    }
  )
}

// ---- Hook publico -----------------------------------------------------------

export const useLandingAnimations = () => {
  const ctx = useRef(null)

  // useLayoutEffect (no useEffect): corre SÍNCRONO antes del primer paint del
  // navegador. Así GSAP aplica el estado inicial (opacity:0, offsets) antes de
  // que el elemento sea visible → elimina el FOUC (el "pop" que aparecía y se
  // recolocaba). Con useEffect, GSAP se ejecutaba tras el primer frame pintado.
  useLayoutEffect(() => {
    ctx.current = gsap.context(() => {
      animateHero()
      animatePainCards()
      animateTrustMetrics()
      animateFeatures()
      animateTimeline()
      animatePricing()
      animateCtaFinal()
    })

    return () => ctx.current.revert()
  }, [])
}
