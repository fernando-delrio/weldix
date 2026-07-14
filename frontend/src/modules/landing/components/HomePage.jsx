import { useOutletContext } from 'react-router-dom'

import { useLandingAnimations } from '../hooks/useLandingAnimations'
import { CtaSection, HeroSection, PainSection } from './LandingPage'

const HomePage = () => {
  const { t, isDark } = useOutletContext()
  useLandingAnimations()

  return (
    <>
      <HeroSection t={t} isDark={isDark} />
      <PainSection t={t} />
      <CtaSection t={t} />
    </>
  )
}

export default HomePage
