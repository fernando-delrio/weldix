import { useState, useEffect } from 'react'

// Captura el evento beforeinstallprompt del navegador para mostrarlo cuando queramos
const usePwaInstall = () => {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // El browser ya instaló la PWA — ocultar el botón
    const standaloneQuery = window.matchMedia('(display-mode: standalone)')
    setIsInstalled(standaloneQuery.matches)

    const onDisplayChange = (e) => setIsInstalled(e.matches)
    standaloneQuery.addEventListener('change', onDisplayChange)

    // El browser lanza este evento cuando la PWA puede instalarse
    const onBeforeInstall = (e) => {
      e.preventDefault() // evita el mini-banner automático del browser
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // Cuando se instala correctamente
    const onInstalled = () => {
      setInstallPrompt(null)
      setIsInstalled(true)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      standaloneQuery.removeEventListener('change', onDisplayChange)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const triggerInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
  }

  // canInstall = el browser soporta instalación Y aún no está instalada
  const canInstall = !!installPrompt && !isInstalled

  return { canInstall, isInstalled, triggerInstall }
}

export default usePwaInstall
