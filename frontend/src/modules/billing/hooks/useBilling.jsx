import { useState } from 'react'
import { billingService } from '../services/billingService'

export const useBilling = () => {
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState(null)

  const startCheckout = async (plan = 'starter') => {
    setIsRedirecting(true)
    setError(null)
    try {
      const url = await billingService.getCheckoutUrl(plan)
      // Redirigir a Stripe Checkout — salimos de la SPA
      window.location.href = url
    } catch (err) {
      setError(err.message)
      setIsRedirecting(false)
    }
  }

  const openPortal = async () => {
    setIsRedirecting(true)
    setError(null)
    try {
      const url = await billingService.getPortalUrl()
      window.location.href = url
    } catch (err) {
      setError(err.message)
      setIsRedirecting(false)
    }
  }

  return { startCheckout, openPortal, isRedirecting, error }
}
