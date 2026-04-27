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
 * Cleanup obligatorio:
 *   ctx.revert() mata todos los ScrollTriggers del contexto.
 *   Sin esto hay memory leaks y animaciones fantasma en HMR de dev.
 */
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ---- Hero: stagger reveal al montar ----------------------------------------

const animateHero = () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

  // Badge "Para talleres" - baja desde arriba
  tl.from('[data-gsap="hero-badge"]', { y: -20, opacity: 0, duration: 0.6 })

  // Headline - cada linea sube con stagger (como Apple splash)
  tl.from('[data-gsap="hero-line"]', {
    y: 60,
    opacity: 0,
    duration: 0.7,
    stagger: 0.12,
    ease: 'power4.out',
  }, '-=0.3')

  // Linea decorativa amber crece de izquierda a derecha
  tl.from('[data-gsap="hero-bar"]', {
    scaleX: 0,
    transformOrigin: 'left center',
    duration: 0.5,
    ease: 'power2.out',
  }, '-=0.4')

  // Subtitulo
  tl.from('[data-gsap="hero-sub"]', { y: 20, opacity: 0, duration: 0.5 }, '-=0.3')

  // Botones CTA
  tl.from('[data-gsap="hero-cta"]', {
    y: 15,
    opacity: 0,
    duration: 0.5,
    stagger: 0.1,
  }, '-=0.25')

  // Stats grid
  tl.from('[data-gsap="hero-stats"]', { opacity: 0, duration: 0.4 }, '-=0.2')

  // Mockup entra desde la derecha - empieza en paralelo con el headline
  tl.from('[data-gsap="hero-mockup"]', {
    x: 60,
    opacity: 0,
    duration: 0.9,
    ease: 'power3.out',
  }, 0.3)

  return tl
}

// ---- Parallax del fondo grid (Apple-style profundidad) ---------------------

const animateHeroParallax = () => {
  gsap.to('[data-gsap="hero-grid"]', {
    yPercent: -20,
    ease: 'none',
    scrollTrigger: {
      trigger: '[data-gsap="hero-section"]',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  })
}

// ---- Mockup flotando en loop (idle animation estilo Apple) -----------------

const animateMockupFloat = () => {
  gsap.to('[data-gsap="hero-mockup"]', {
    y: -8,
    duration: 3.5,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  })
}

// ---- Pain points: stagger de tarjetas --------------------------------------

const animatePainCards = () => {
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

// ---- Features: stagger up con delay escalonado -----------------------------

const animateFeatures = () => {
  ScrollTrigger.batch('[data-gsap="feature-card"]', {
    onEnter: (els) => {
      gsap.from(els, {
        y: 50,
        opacity: 0,
        duration: 0.65,
        stagger: 0.08,
        ease: 'power3.out',
      })
    },
    once: true,
    start: 'top 82%',
  })
}

// ---- Timeline (Como funciona): la linea se dibuja al hacer scroll ----------
//
// Apple-style: el usuario ve literalmente como avanza el proceso
// mientras baja por la pagina.

const animateTimeline = () => {
  gsap.fromTo('[data-gsap="timeline-progress"]',
    { scaleX: 0, transformOrigin: 'left center' },
    {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: '[data-gsap="timeline-section"]',
        start: 'top 60%',
        end: 'bottom 70%',
        scrub: 1.2,
      },
    }
  )

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

// ---- Testimonials ----------------------------------------------------------

const animateTestimonials = () => {
  ScrollTrigger.batch('[data-gsap="testimonial"]', {
    onEnter: (els) => {
      gsap.from(els, {
        y: 35,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: 'power3.out',
      })
    },
    once: true,
    start: 'top 80%',
  })

  gsap.from('[data-gsap="roi-metric"]', {
    scale: 0.9,
    opacity: 0,
    duration: 0.65,
    ease: 'back.out(1.7)',
    scrollTrigger: {
      trigger: '[data-gsap="roi-metric"]',
      start: 'top 85%',
      once: true,
    },
  })
}

// ---- Pricing ---------------------------------------------------------------

const animatePricing = () => {
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
  })
  .from('[data-gsap="cta-sub"]', {
    y: 20,
    opacity: 0,
    duration: 0.5,
  }, '-=0.4')
  .from('[data-gsap="cta-buttons"]', {
    y: 20,
    opacity: 0,
    duration: 0.5,
    stagger: 0.1,
  }, '-=0.3')

  gsap.fromTo('[data-gsap="cta-primary"]',
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

  useEffect(() => {
    ctx.current = gsap.context(() => {
      animateHero()
      animateHeroParallax()
      animatePainCards()
      animateTrustMetrics()
      animateFeatures()
      animateTimeline()
      animateTestimonials()
      animatePricing()
      animateCtaFinal()
    })

    return () => ctx.current.revert()
  }, [])
}
