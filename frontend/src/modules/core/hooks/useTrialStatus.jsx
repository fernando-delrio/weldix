import { useEffect, useState } from 'react'
import { authService } from '../../auth/services/authService'

const DISMISSED_KEY = 'weldix_trial_banner_dismissed'

const useTrialStatus = () => {
  const [trial, setTrial] = useState(null) // null = cargando
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISSED_KEY) === 'true')

  useEffect(() => {
    authService
      .getTrialStatus()
      .then(setTrial)
      .catch(() => setTrial({ is_trial: false, is_expired: false, days_left: null }))
  }, [])

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  const showBanner = trial?.is_trial && !trial?.is_expired && trial?.days_left <= 5 && !dismissed
  const isExpired = trial?.is_expired ?? false

  return { trial, showBanner, isExpired, dismiss }
}

export default useTrialStatus
