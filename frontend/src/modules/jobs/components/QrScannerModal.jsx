import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import WeldixButton from '../../core/components/WeldixButton'
import useFocusTrap from '../../core/hooks/useFocusTrap'

/**
 * 🆕 html5-qrcode — librería que accede a la cámara del dispositivo y decodifica QRs.
 * En tablet de empresa, el operario escanea el código QR de la OT física
 * en lugar de teclarlo. El QR debe contener el código de la OT (ej: "ORD-2026-003").
 *
 * Flujo: onDetected(code) → componente padre rellena el input de código.
 */

const QrScannerModal = ({ onDetected, onClose }) => {
  const modalRef = useRef(null)
  useFocusTrap(modalRef)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  const scannerRef = useRef(null)
  const containerId = 'qr-reader-container'

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner

    // Configuración: cámara trasera, tamaño de ventana QR en px
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          // Al detectar un QR, paramos el scanner y notificamos al padre
          scanner.stop().catch(() => {})
          onDetected(decodedText.trim().toUpperCase())
          onClose()
        },
        () => {
          // onScanFailure — se llama continuamente mientras no detecta nada. La ignoramos.
        }
      )
      .then(() => setReady(true))
      .catch((err) => setError(`No se pudo acceder a la cámara: ${err}`))

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [onDetected, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Escanear QR"
        className="relative w-full max-w-[360px] rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-100">Escanear QR</h2>
          <WeldixButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar escáner QR"
            className="h-11 w-11 border border-slate-700"
          >
            ✕
          </WeldixButton>
        </div>

        {error ? (
          <p className="text-sm text-rose-400">{error}</p>
        ) : (
          <>
            {!ready && (
              <p className="mb-2 text-center text-xs text-slate-500">Iniciando cámara...</p>
            )}
            {/* html5-qrcode monta el video dentro de este div */}
            <div id={containerId} className="overflow-hidden rounded-xl border border-slate-800" />
            <p className="mt-3 text-center text-xs text-slate-500">Apunta al código QR de la OT</p>
          </>
        )}
      </div>
    </div>
  )
}

export default QrScannerModal
