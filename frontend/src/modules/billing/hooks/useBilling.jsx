import { useCallback, useState } from 'react'
import { billingService } from '../services/billingService'

export const useBilling = () => {
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)

  // No se auto-carga aquí: /billing/status es solo-admin (403 para operario) y
  // useBilling lo usan también componentes que no necesitan status (TrialBanner).
  // Quien necesite el estado lo pide explícitamente (ver BillingStatusCard).
  const refreshStatus = useCallback(async () => {
    setIsLoadingStatus(true)
    try {
      setStatus(await billingService.getStatus())
    } catch {
      setStatus(null)
    } finally {
      setIsLoadingStatus(false)
    }
  }, [])

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

  return { startCheckout, openPortal, isRedirecting, error, status, isLoadingStatus, refreshStatus }
}
