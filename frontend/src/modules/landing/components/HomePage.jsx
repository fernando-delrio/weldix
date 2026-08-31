import { useOutletContext } from 'react-router-dom'

import { useLandingAnimations } from '../hooks/useLandingAnimations'
import { CtaSection, HeroSection, PainSection, TrustMetricsBar } from './LandingPage'

// Inicio es el sprint corto: pain → confianza → CTA. "Cómo funciona" y
// "Precios" viven solo en sus páginas dedicadas (con más contenido cada una
// — tabla comparativa, reserva de demo — que lo que había aquí), para no
// repetir la misma sección palabra por palabra en dos URLs distintas.
const HomePage = () => {
  const { t, isDark } = useOutletContext()
  useLandingAnimations()

  return (
    <>
      <HeroSection t={t} isDark={isDark} />
      <PainSection t={t} />
      <TrustMetricsBar t={t} isDark={isDark} />
      <CtaSection t={t} />
    </>
  )
}

export default HomePage
