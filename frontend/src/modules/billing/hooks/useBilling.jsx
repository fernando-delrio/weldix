import { useState } from 'react'
import { billingService } from '../services/billingService'

export const useBilling = () => {
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState(null)

  // Inicia el checkout — el backend calcula el precio por operarios automáticamente
  const startCheckout = async () => {
    setIsRedirecting(true)
    setError(null)
    try {
      const { checkout_url } = await billingService.getCheckoutUrl()
      window.location.href = checkout_url
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
