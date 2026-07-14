import { useOutletContext } from 'react-router-dom'

import { useLandingAnimations } from '../hooks/useLandingAnimations'
import { CtaSection, HeroSection, PainSection, TrustMetricsBar } from './LandingPage'

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
