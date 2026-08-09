import { useRef, useState } from 'react'
import WeldixButton from '../../core/components/WeldixButton'
import useFocusTrap from '../../core/hooks/useFocusTrap'

const labelBase = 'mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400'
const textareaBase =
  'w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'

const isEmptyMotivo = (motivo) => !motivo || motivo.trim() === ''
const validationError = (motivo) => (isEmptyMotivo(motivo) ? 'El motivo es obligatorio' : null)

const errorBanner = ({ error }) => error && <p className="mt-3 text-sm text-rose-400">{error}</p>

const RechazarJobModal = ({ job, onClose, onConfirm }) => {
  const modalRef = useRef(null)
  useFocusTrap(modalRef)

  const [motivo, setMotivo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    const validError = validationError(motivo)
    return validError ? setError(validError) : executeConfirm()
  }

  const executeConfirm = async () => {
    setIsLoading(true)
    setError('')
    try {
      await onConfirm(motivo)
      onClose()
    } catch (err) {
      setError(err.message ?? 'Error al rechazar el trabajo.')
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Rechazar trabajo"
        className="relative z-10 w-full max-w-[420px] rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-100">
            Rechazar {job?.code ?? 'trabajo'}
          </h2>
          <WeldixButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar modal de rechazo"
            className="h-11 w-11 border border-slate-700"
          >
            ✕
          </WeldixButton>
        </div>

        <div className="grid gap-1">
          <label className={labelBase}>Motivo del rechazo</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Describe qué le falta o qué está mal a este trabajo"
            rows={4}
            className={textareaBase}
          />
        </div>

        {errorBanner({ error })}

        <WeldixButton
          variant="danger"
          size="lg"
          onClick={handleConfirm}
          isLoading={isLoading}
          loadingLabel="Rechazando…"
          className="mt-5 w-full"
        >
          Devolver a pendiente
        </WeldixButton>
      </div>
    </div>
  )
}

export default RechazarJobModal
