import { useState } from 'react'
import { cx } from '../../core/lib/cx'

const JOB_TYPES = ['Inox', 'Caldereria Industrial', 'Estructura Metalica', 'Otro']

const fieldBase =
  'flex min-h-[48px] items-center rounded-lg border border-slate-700 bg-slate-900/70 transition focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20'
const inputBase =
  'w-full bg-transparent px-3.5 text-[0.95rem] text-slate-100 outline-none placeholder:text-slate-500'
const labelBase = 'mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-400'

const submitLabel = ({ isSubmitting }) => isSubmitting ? 'CREANDO...' : 'CREAR TRABAJO'

function NewJobModal({ onClose, onCreated }) {
  const [ot, setOt] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState(JOB_TYPES[0])
  const [client, setClient] = useState('')
  const [due, setDue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 400))
    onCreated({ id: ot, title, type, client, due, status: 'Pendiente', tone: 'warning', progress: 0 })
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[480px] rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-100">Nuevo trabajo</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-1">
          <label className={labelBase}>Nº OT</label>
          <div className={fieldBase}>
            <input
              type="text"
              value={ot}
              onChange={(e) => setOt(e.target.value)}
              placeholder="ORD-2024-XXX"
              required
              className={inputBase}
            />
          </div>

          <label className={labelBase}>Titulo / descripcion</label>
          <div className={fieldBase}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descripcion del trabajo"
              required
              className={inputBase}
            />
          </div>

          <label className={labelBase}>Tipo</label>
          <div className={cx(fieldBase, 'px-3.5')}>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-transparent text-[0.95rem] text-slate-100 outline-none"
            >
              {JOB_TYPES.map((t) => (
                <option key={t} value={t} className="bg-slate-900">
                  {t}
                </option>
              ))}
            </select>
          </div>

          <label className={labelBase}>Cliente</label>
          <div className={fieldBase}>
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Nombre del cliente"
              required
              className={inputBase}
            />
          </div>

          <label className={labelBase}>Fecha de entrega</label>
          <div className={fieldBase}>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              required
              className={cx(inputBase, 'text-slate-400')}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 h-12 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-sm font-bold tracking-[0.1em] text-white transition hover:from-sky-400 hover:to-blue-500 disabled:opacity-60"
          >
            {submitLabel({ isSubmitting })}
          </button>
        </form>
      </div>
    </div>
  )
}

export default NewJobModal
