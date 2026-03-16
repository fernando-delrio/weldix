import { cx } from '../../core/lib/cx'
import { useStartByOrtForm } from '../hooks/useStartByOrtForm'

const fieldBase =
  'flex min-h-[48px] items-center rounded-lg border border-slate-700 bg-slate-900/70 transition focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20'
const inputBase =
  'w-full bg-transparent px-3.5 text-[0.95rem] text-slate-100 outline-none placeholder:text-slate-500 uppercase tracking-widest'
const labelBase = 'mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-400'

const jobPreview = ({ job }) =>
  job && (
    <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1">
      <p className="text-[0.62rem] font-bold uppercase tracking-widest text-emerald-400">{job.code}</p>
      <p className="text-base font-semibold text-slate-100">{job.titulo}</p>
      <p className="text-sm text-slate-400">{job.cliente}</p>
      {job.fecha_inicio && (
        <p className="text-[0.7rem] uppercase tracking-widest text-slate-500">
          Entrega: {job.fecha_inicio}
        </p>
      )}
    </div>
  )

const errorBanner = ({ error }) =>
  error && <p className="mt-3 text-sm text-rose-400">{error}</p>

const StartJobByOrtModal = ({ onClose, onStart }) => {
  const form = useStartByOrtForm({ onStart, onClose })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[420px] rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-100">Iniciar trabajo</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-400">
          Introduce el número de OT que te ha asignado el jefe de taller.
        </p>

        <form onSubmit={form.search} className="grid gap-1">
          <label className={labelBase}>Número de OT</label>
          <div className={cx(fieldBase, 'gap-0')}>
            <input
              type="text"
              value={form.code}
              onChange={(e) => { form.setCode(e.target.value) }}
              placeholder="ORD-2026-001"
              autoFocus
              className={inputBase}
            />
            <button
              type="submit"
              disabled={form.isSearching || !form.code.trim()}
              className="shrink-0 rounded-r-lg border-l border-slate-700 px-4 text-[0.7rem] font-bold uppercase tracking-widest text-sky-300 transition hover:bg-sky-500/10 disabled:opacity-40"
            >
              {form.isSearching ? '...' : 'Buscar'}
            </button>
          </div>
        </form>

        {errorBanner({ error: form.error })}
        {jobPreview({ job: form.job })}

        {form.job && (
          <button
            type="button"
            onClick={form.confirm}
            disabled={form.isStarting}
            className="mt-4 h-12 w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-sm font-bold tracking-[0.1em] text-white transition hover:from-sky-400 hover:to-blue-500 disabled:opacity-60"
          >
            {form.isStarting ? 'Iniciando...' : 'Confirmar e iniciar'}
          </button>
        )}
      </div>
    </div>
  )
}

export default StartJobByOrtModal
