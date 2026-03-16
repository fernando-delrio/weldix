import { cx } from '../../core/lib/cx'
import { JOB_TYPES, useNewJobForm } from '../hooks/useNewJobForm'

const fieldBase =
  'flex min-h-[48px] items-center rounded-lg border border-slate-700 bg-slate-900/70 transition focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20'
const inputBase =
  'w-full bg-transparent px-3.5 text-[0.95rem] text-slate-100 outline-none placeholder:text-slate-500'
const labelBase = 'mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-400'

const submitLabel = ({ isSubmitting }) => isSubmitting ? 'CREANDO...' : 'CREAR TRABAJO'

const errorBanner = ({ error }) =>
  error && <p className="mt-2 text-sm text-rose-400">{error}</p>

const NewJobModal = ({ onClose, onCreated }) => {
  const form = useNewJobForm({ onCreated })

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

        <form onSubmit={form.submit} className="grid gap-1">
          <label className={labelBase}>Nº OT</label>
          <div className={fieldBase}>
            <input
              type="text"
              value={form.code}
              onChange={(e) => form.setCode(e.target.value)}
              placeholder="ORD-2024-XXX"
              className={inputBase}
            />
          </div>

          <label className={labelBase}>Titulo / descripcion</label>
          <div className={fieldBase}>
            <input
              type="text"
              value={form.title}
              onChange={(e) => form.setTitle(e.target.value)}
              placeholder="Descripcion del trabajo"
              required
              className={inputBase}
            />
          </div>

          <label className={labelBase}>Tipo</label>
          <div className={cx(fieldBase, 'px-3.5')}>
            <select
              value={form.type}
              onChange={(e) => form.setType(e.target.value)}
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
              value={form.client}
              onChange={(e) => form.setClient(e.target.value)}
              placeholder="Nombre del cliente"
              required
              className={inputBase}
            />
          </div>

          <label className={labelBase}>Fecha de entrega</label>
          <div className={fieldBase}>
            <input
              type="date"
              value={form.due}
              onChange={(e) => form.setDue(e.target.value)}
              className={cx(inputBase, 'text-slate-400')}
            />
          </div>

          <label className={labelBase}>Asignar a operario</label>
          <div className={cx(fieldBase, 'px-3.5')}>
            <select
              value={form.operarioId}
              onChange={(e) => form.setOperarioId(e.target.value)}
              className="w-full bg-transparent text-[0.95rem] text-slate-100 outline-none"
            >
              <option value="" className="bg-slate-900">Sin asignar</option>
              {form.operarios.map((op) => (
                <option key={op.id} value={op.id} className="bg-slate-900">
                  {op.full_name || op.email}
                </option>
              ))}
            </select>
          </div>

          {errorBanner({ error: form.error })}

          <button
            type="submit"
            disabled={form.isSubmitting}
            className="mt-4 h-12 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-sm font-bold tracking-[0.1em] text-white transition hover:from-sky-400 hover:to-blue-500 disabled:opacity-60"
          >
            {submitLabel({ isSubmitting: form.isSubmitting })}
          </button>
        </form>
      </div>
    </div>
  )
}

export default NewJobModal
