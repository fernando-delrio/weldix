import { useEffect, useMemo, useState } from 'react'
import { descargarFichajesCsv, forzarCierreJornada } from '../services/fichajeService'

const cardBase = 'rounded-xl border border-white/[0.06] bg-slate-900'
const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

const pad2 = (n) => String(n).padStart(2, '0')
const ymd = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

const formatFecha = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return (
    d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) +
    ' - ' +
    d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  )
}

const formatHoras = (horas) => {
  if (horas == null) return '-'
  const h = Number(horas)
  if (!Number.isFinite(h)) return '-'
  return `${h.toFixed(2)}h`
}

const workerCode = (n) => (Number.isFinite(n) ? `OP-${String(n).padStart(3, '0')}` : 'OP----')
const isHorasInvalidas = (h) =>
  !h || isNaN(parseFloat(h)) || parseFloat(h) <= 0 || parseFloat(h) > 16

const alphaByName = (a, b) => {
  const an = (a.full_name || a.email || '').toLowerCase()
  const bn = (b.full_name || b.email || '').toLowerCase()
  return an.localeCompare(bn, 'es')
}

const fichajesByDay = (fichajes) =>
  fichajes.reduce((acc, f) => {
    if (!f?.inicio) return acc
    const start = new Date(f.inicio)
    const end = f.fin ? new Date(f.fin) : new Date()
    const hours = Number.isFinite(f.horas) ? f.horas : Math.max(0, (end - start) / 36e5)
    const key = ymd(start)
    acc[key] = (acc[key] || 0) + hours
    return acc
  }, {})

const buildMonthCells = (year, month) => {
  const first = new Date(year, month, 1)
  const startDow = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startDow; i += 1) cells.push(null)
  for (let day = 1; day <= days; day += 1) {
    cells.push(new Date(year, month, day))
  }
  return cells
}

const levelClass = (hours) => {
  if (!hours) return 'bg-slate-900 text-slate-600 border-slate-800/70'
  if (hours < 4) return 'bg-sky-500/20 text-sky-300 border-sky-700/40'
  if (hours < 8) return 'bg-sky-500/30 text-sky-200 border-sky-600/50'
  return 'bg-emerald-500/25 text-emerald-200 border-emerald-600/50'
}

const openFichaje = (fichajes) => fichajes.find((f) => f.fin == null) || null
const byInicioDesc = (a, b) =>
  new Date(b?.inicio || 0).getTime() - new Date(a?.inicio || 0).getTime()

const ForzarCierreModal = ({ fichaje, onClose, onConfirm, isSubmitting, error }) => {
  const [horas, setHoras] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="modal-slide-up relative z-10 w-full max-w-[400px] rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div
          className="mx-auto mb-4 h-1 w-8 rounded-full bg-slate-600 sm:hidden"
          aria-hidden="true"
        />

        <h2 className="text-base font-bold tracking-tight text-slate-100">
          Cerrar jornada manualmente
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Operario: <span className="font-semibold text-slate-200">{fichaje.operario_nombre}</span>
        </p>
        <p className="text-xs text-slate-400">
          Entrada:{' '}
          <span className="font-semibold text-slate-200">{formatFecha(fichaje.inicio)}</span>
        </p>

        <div className="mt-4">
          <label className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-400">
            Horas trabajadas reales
          </label>
          <input
            type="number"
            min="0.1"
            max="16"
            step="0.5"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            placeholder="Ej: 8"
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-700 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(parseFloat(horas))}
            disabled={isSubmitting || isHorasInvalidas(horas)}
            className="flex-1 rounded-xl bg-gradient-to-r from-rose-500/80 to-rose-600/80 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:from-rose-500 hover:to-rose-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Cerrando...' : 'Confirmar cierre'}
          </button>
        </div>
      </div>
    </div>
  )
}

const OperarioCalendar = ({ fichajes }) => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const byDay = fichajesByDay(fichajes)
  const cells = buildMonthCells(year, month)

  return (
    <div className="space-y-2">
      <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-slate-500">
        Calendario mensual
      </p>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-[0.55rem] font-bold uppercase text-slate-600">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateObj, idx) => {
          if (!dateObj) {
            return <div key={`empty-${idx}`} className="h-7 rounded-md border border-transparent" />
          }
          const key = ymd(dateObj)
          const hours = byDay[key] || 0
          return (
            <div
              key={key}
              title={
                hours
                  ? `${dateObj.toLocaleDateString('es-ES')}: ${hours.toFixed(2)}h`
                  : dateObj.toLocaleDateString('es-ES')
              }
              className={`flex h-7 items-center justify-center rounded-md border text-[0.65rem] font-semibold ${levelClass(hours)}`}
            >
              {dateObj.getDate()}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ActiveJobs = ({ jobs }) => (
  <div className="space-y-1.5">
    <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-slate-500">
      Ordenes activas
    </p>
    {jobs.length === 0 && <p className="text-xs text-slate-500">Sin OTs activas.</p>}
    {jobs.map((job) => (
      <div
        key={job.id}
        className="rounded-lg border border-slate-800/80 bg-slate-950/50 px-2.5 py-2"
      >
        <p className="text-xs font-semibold text-slate-200">
          {job.code || `OT-${job.id}`} - {job.titulo}
        </p>
        <p className="mt-0.5 text-[0.65rem] text-slate-500">Estado: {job.estado}</p>
      </div>
    ))}
  </div>
)

const FichajesTable = ({ fichajes }) => {
  const recientes = [...fichajes].sort(byInicioDesc).slice(0, 30)

  return (
    <div className="space-y-1.5">
      <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-slate-500">
        Fichajes recientes
      </p>
      <div className="rounded-lg border border-slate-800/80 bg-slate-950/35">
        <div className="max-h-[340px] overflow-y-scroll">
          <table className="w-full table-fixed">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
                <th className="w-[41%] py-2.5 pl-3 pr-2 text-left text-[0.58rem] font-bold uppercase tracking-widest text-slate-500">
                  Entrada
                </th>
                <th className="w-[41%] py-2.5 pr-2 text-left text-[0.58rem] font-bold uppercase tracking-widest text-slate-500">
                  Salida
                </th>
                <th className="w-[18%] py-2.5 pr-3 text-left text-[0.58rem] font-bold uppercase tracking-widest text-slate-500">
                  Horas
                </th>
              </tr>
            </thead>
            <tbody>
              {recientes.map((f) => (
                <tr key={f.id} className="border-b border-slate-800/60 last:border-0">
                  <td className="py-2.5 pl-3 pr-2 text-[0.76rem] text-slate-300">
                    {formatFecha(f.inicio)}
                  </td>
                  <td className="py-2.5 pr-2 text-[0.76rem] text-slate-400">
                    {f.fin ? formatFecha(f.fin) : 'En jornada'}
                  </td>
                  <td className="py-2.5 pr-3 text-[0.76rem] font-semibold text-slate-300">
                    {formatHoras(f.horas)}
                  </td>
                </tr>
              ))}
              {recientes.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-slate-500">
                    Sin fichajes todavia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const OperarioCard = ({ operario, onForzarCierre, isExpanded, onToggle }) => {
  const open = openFichaje(operario.fichajes || [])
  const panelId = `operario-panel-${operario.id}`

  return (
    <article className={`${cardBase} p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="min-w-[180px]">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-slate-500">
            {workerCode(operario.worker_number)}
          </p>
          <h3 className="mt-1 text-base font-bold text-slate-100">
            {operario.full_name || operario.email}
          </h3>
          <p className="text-xs text-slate-400">{operario.email}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span className="rounded-md border border-sky-700/50 bg-sky-500/10 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-widest text-sky-300">
            {operario.active_jobs_count} OTs activas
          </span>
          <span className="rounded-md border border-amber-700/50 bg-amber-500/10 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-widest text-amber-300">
            {operario.pending_vacaciones_count} vacaciones pendientes
          </span>
          <span className="rounded-md border border-violet-700/50 bg-violet-500/10 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-widest text-violet-300">
            {operario.pending_vacaciones_dias} dias
          </span>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={panelId}
            className="rounded-md border border-slate-600/80 bg-slate-800/60 px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-widest text-slate-200 transition hover:border-sky-500/70 hover:text-sky-200"
          >
            {isExpanded ? 'Ocultar' : 'Desplegar'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div id={panelId} className="mt-3 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <ActiveJobs jobs={operario.active_jobs || []} />
          </div>
          <div className="lg:col-span-5">
            <FichajesTable fichajes={operario.fichajes || []} />
          </div>
          <div className="lg:col-span-4">
            <OperarioCalendar fichajes={operario.fichajes || []} />
          </div>
        </div>
      )}

      {open && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-700/50 bg-emerald-500/10 px-3 py-2">
          <p className="text-xs text-emerald-200">
            Jornada abierta desde {formatFecha(open.inicio)}
          </p>
          <button
            type="button"
            onClick={() => onForzarCierre(open, operario)}
            className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-rose-300 transition hover:bg-rose-500/20"
          >
            Cerrar jornada
          </button>
        </div>
      )}
    </article>
  )
}

const FichajesAdminSection = ({ operarios = [], onRefresh }) => {
  const [cierreFichaje, setCierreFichaje] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cierreError, setCierreError] = useState('')
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [exportError, setExportError] = useState('')
  const [expandedByOperario, setExpandedByOperario] = useState({})

  const sortedOperarios = useMemo(() => [...operarios].sort(alphaByName), [operarios])

  useEffect(() => {
    setExpandedByOperario((prev) => {
      const next = {}
      sortedOperarios.forEach((operario, index) => {
        next[operario.id] = Object.prototype.hasOwnProperty.call(prev, operario.id)
          ? prev[operario.id]
          : index === 0
      })
      return next
    })
  }, [sortedOperarios])

  const handleForzarCierre = async (horasReales) => {
    if (!cierreFichaje) return
    setIsSubmitting(true)
    setCierreError('')
    try {
      await forzarCierreJornada(cierreFichaje.id, horasReales)
      setCierreFichaje(null)
      onRefresh?.()
    } catch (err) {
      setCierreError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExportCsv = async () => {
    const now = new Date()
    setIsExportingCsv(true)
    setExportError('')
    try {
      await descargarFichajesCsv({ year: now.getFullYear(), month: now.getMonth() + 1 })
    } catch (err) {
      setExportError(err.message || 'No se pudo exportar el CSV')
    } finally {
      setIsExportingCsv(false)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[0.64rem] font-bold uppercase tracking-[0.2em] text-sky-300">
          Operarios
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            className="rounded-md border border-emerald-700/70 bg-emerald-500/10 px-2 py-0.5 text-[0.56rem] font-bold uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-60"
          >
            {isExportingCsv ? 'Exportando...' : 'Exportar CSV'}
          </button>
          <button
            type="button"
            onClick={() =>
              setExpandedByOperario(
                Object.fromEntries(sortedOperarios.map((operario) => [operario.id, true]))
              )
            }
            className="rounded-md border border-slate-700/70 bg-slate-800/40 px-2 py-0.5 text-[0.56rem] font-bold uppercase tracking-widest text-slate-300 transition hover:border-sky-600/70 hover:text-sky-200"
          >
            Expandir todo
          </button>
          <button
            type="button"
            onClick={() =>
              setExpandedByOperario(
                Object.fromEntries(sortedOperarios.map((operario) => [operario.id, false]))
              )
            }
            className="rounded-md border border-slate-700/70 bg-slate-800/40 px-2 py-0.5 text-[0.56rem] font-bold uppercase tracking-widest text-slate-300 transition hover:border-sky-600/70 hover:text-sky-200"
          >
            Colapsar todo
          </button>
          <span className="rounded-md border border-slate-700/60 bg-slate-800/40 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-widest text-slate-300">
            {sortedOperarios.length} en plantilla
          </span>
        </div>
      </div>

      {exportError && <p className="text-xs text-rose-400">{exportError}</p>}

      {sortedOperarios.length === 0 && (
        <div className={`${cardBase} p-4`}>
          <p className="text-sm text-slate-500">Sin operarios registrados todavia.</p>
        </div>
      )}

      {sortedOperarios.map((operario) => (
        <OperarioCard
          key={operario.id}
          operario={operario}
          isExpanded={!!expandedByOperario[operario.id]}
          onToggle={() => {
            setExpandedByOperario((prev) => ({
              ...prev,
              [operario.id]: !prev[operario.id],
            }))
          }}
          onForzarCierre={(fichaje) => {
            setCierreFichaje({ ...fichaje, operario_nombre: operario.full_name || operario.email })
            setCierreError('')
          }}
        />
      ))}

      {cierreFichaje && (
        <ForzarCierreModal
          fichaje={cierreFichaje}
          onClose={() => setCierreFichaje(null)}
          onConfirm={handleForzarCierre}
          isSubmitting={isSubmitting}
          error={cierreError}
        />
      )}
    </section>
  )
}

export default FichajesAdminSection
