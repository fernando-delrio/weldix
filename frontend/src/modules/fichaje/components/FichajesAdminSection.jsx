import { useEffect, useMemo, useState } from 'react'
import {
  descargarFichajesCsvRango,
  forzarCierreJornada,
  getResumenExtras,
} from '../services/fichajeService'
import WeldixButton from '../../core/components/WeldixButton'

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
          <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
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
          <WeldixButton variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </WeldixButton>
          <WeldixButton
            variant="danger"
            className="flex-1"
            onClick={() => onConfirm(parseFloat(horas))}
            isLoading={isSubmitting}
            loadingLabel="Cerrando jornada…"
            disabled={isHorasInvalidas(horas)}
          >
            Confirmar cierre
          </WeldixButton>
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
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        Calendario mensual
      </p>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs font-bold uppercase text-slate-600">
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
              className={`flex h-7 items-center justify-center rounded-md border text-xs font-semibold ${levelClass(hours)}`}
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
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Ordenes activas</p>
    {jobs.length === 0 && <p className="text-xs text-slate-500">Sin OTs activas.</p>}
    {jobs.map((job) => (
      <div
        key={job.id}
        className="rounded-lg border border-slate-800/80 bg-slate-950/50 px-2.5 py-2"
      >
        <p className="text-xs font-semibold text-slate-200">
          {job.code || `OT-${job.id}`} - {job.titulo}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">Estado: {job.estado}</p>
      </div>
    ))}
  </div>
)

const FichajesTable = ({ fichajes }) => {
  const recientes = [...fichajes].sort(byInicioDesc).slice(0, 30)

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        Fichajes recientes
      </p>
      <div className="rounded-lg border border-slate-800/80 bg-slate-950/35">
        <div className="max-h-[340px] overflow-y-scroll">
          <table className="w-full table-fixed">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
                <th className="w-[41%] py-2.5 pl-3 pr-2 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                  Entrada
                </th>
                <th className="w-[41%] py-2.5 pr-2 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                  Salida
                </th>
                <th className="w-[18%] py-2.5 pr-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                  Horas
                </th>
              </tr>
            </thead>
            <tbody>
              {recientes.map((f) => (
                <tr key={f.id} className="border-b border-slate-800/60 last:border-0">
                  <td className="py-2.5 pl-3 pr-2 text-xs text-slate-300">
                    {formatFecha(f.inicio)}
                  </td>
                  <td className="py-2.5 pr-2 text-xs text-slate-400">
                    {f.fin ? formatFecha(f.fin) : 'En jornada'}
                  </td>
                  <td className="py-2.5 pr-3 text-xs font-semibold text-slate-300">
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
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {workerCode(operario.worker_number)}
          </p>
          <h3 className="mt-1 text-base font-bold text-slate-100">
            {operario.full_name || operario.email}
          </h3>
          <p className="text-xs text-slate-400">{operario.email}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span className="rounded-md border border-sky-700/50 bg-sky-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-sky-300">
            {operario.active_jobs_count} OTs activas
          </span>
          <span className="rounded-md border border-amber-700/50 bg-amber-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-amber-300">
            {operario.pending_vacaciones_count} vacaciones pendientes
          </span>
          <span className="rounded-md border border-violet-700/50 bg-violet-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-violet-300">
            {operario.pending_vacaciones_dias} dias
          </span>
          <WeldixButton
            variant="secondary"
            size="sm"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={panelId}
          >
            {isExpanded ? 'Ocultar' : 'Desplegar'}
          </WeldixButton>
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
          <WeldixButton variant="danger" size="sm" onClick={() => onForzarCierre(open, operario)}>
            Cerrar jornada
          </WeldixButton>
        </div>
      )}
    </article>
  )
}

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
const firstOfMonthStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`
}

const ExtrasRow = ({ row }) => {
  const hasExtras = row.horas_extra > 0
  return (
    <tr className="border-b border-slate-800/60 last:border-0">
      <td className="py-2.5 pl-3 pr-2 text-xs font-semibold text-slate-200">
        {row.operario_nombre}
      </td>
      <td className="py-2.5 pr-2 text-center text-xs text-slate-400">{row.total_jornadas}</td>
      <td className="py-2.5 pr-2 text-center text-xs text-slate-300">
        {row.total_horas.toFixed(2)}h
      </td>
      <td className="py-2.5 pr-2 text-center text-xs text-slate-400">
        {row.horas_ordinarias.toFixed(2)}h
      </td>
      <td
        className={`py-2.5 pr-3 text-center text-xs font-bold ${hasExtras ? 'text-amber-400' : 'text-slate-600'}`}
      >
        {hasExtras ? `+${row.horas_extra.toFixed(2)}h` : '—'}
      </td>
    </tr>
  )
}

const ResumenExtrasPanel = ({ desde, hasta }) => {
  const [resumen, setResumen] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setIsLoading(true)
    setError('')
    getResumenExtras({ desde, hasta })
      .then(setResumen)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [desde, hasta])

  const totalExtras = resumen.reduce((s, r) => s + r.horas_extra, 0)

  return (
    <div className="rounded-xl border border-amber-700/30 bg-amber-500/5 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-400">
          Resumen de horas extras
        </p>
        {totalExtras > 0 && (
          <span className="rounded-md border border-amber-700/50 bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300">
            {totalExtras.toFixed(2)}h extras en total
          </span>
        )}
      </div>

      {isLoading && <p className="mt-3 text-xs text-slate-500">Calculando…</p>}
      {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}

      {!isLoading && !error && (
        <div className="mt-3 rounded-lg border border-slate-800/80 bg-slate-950/35">
          <div className="max-h-[320px] overflow-y-auto">
            <table className="w-full table-fixed">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
                  <th className="w-[34%] py-2 pl-3 pr-2 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                    Operario
                  </th>
                  <th className="w-[13%] py-2 pr-2 text-center text-xs font-bold uppercase tracking-widest text-slate-500">
                    Jornadas
                  </th>
                  <th className="w-[18%] py-2 pr-2 text-center text-xs font-bold uppercase tracking-widest text-slate-500">
                    Total
                  </th>
                  <th className="w-[18%] py-2 pr-2 text-center text-xs font-bold uppercase tracking-widest text-slate-500">
                    Ordinarias
                  </th>
                  <th className="w-[17%] py-2 pr-3 text-center text-xs font-bold uppercase tracking-widest text-amber-500">
                    Extras
                  </th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((row) => (
                  <ExtrasRow key={row.operario_id} row={row} />
                ))}
                {resumen.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                      Sin datos en el rango seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const FichajesAdminSection = ({ operarios = [], onRefresh }) => {
  const [cierreFichaje, setCierreFichaje] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cierreError, setCierreError] = useState('')
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [exportError, setExportError] = useState('')
  const [expandedByOperario, setExpandedByOperario] = useState({})
  const [showExtras, setShowExtras] = useState(false)
  const [desde, setDesde] = useState(firstOfMonthStr)
  const [hasta, setHasta] = useState(todayStr)

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
    setIsExportingCsv(true)
    setExportError('')
    try {
      await descargarFichajesCsvRango({ desde: desde || undefined, hasta: hasta || undefined })
    } catch (err) {
      setExportError(err.message || 'No se pudo exportar el CSV')
    } finally {
      setIsExportingCsv(false)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300">Operarios</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-slate-700/60 bg-slate-800/40 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-slate-300">
            {sortedOperarios.length} en plantilla
          </span>
          <WeldixButton
            variant="ghost"
            size="sm"
            onClick={() =>
              setExpandedByOperario(
                Object.fromEntries(sortedOperarios.map((operario) => [operario.id, true]))
              )
            }
          >
            Expandir todo
          </WeldixButton>
          <WeldixButton
            variant="ghost"
            size="sm"
            onClick={() =>
              setExpandedByOperario(
                Object.fromEntries(sortedOperarios.map((operario) => [operario.id, false]))
              )
            }
          >
            Colapsar todo
          </WeldixButton>
        </div>
      </div>

      {/* Barra de rango de fechas + acciones de exportación */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Desde
          </label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Hasta
          </label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </div>
        <WeldixButton
          variant="success"
          size="sm"
          onClick={handleExportCsv}
          isLoading={isExportingCsv}
          loadingLabel="Exportando…"
        >
          <i className="bx bx-download mr-1" aria-hidden="true" />
          Exportar CSV (Inspección de Trabajo)
        </WeldixButton>
        <WeldixButton
          variant={showExtras ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setShowExtras((v) => !v)}
        >
          <i className="bx bx-time-five mr-1" aria-hidden="true" />
          {showExtras ? 'Ocultar extras' : 'Ver horas extras'}
        </WeldixButton>
      </div>

      {exportError && <p className="text-xs text-rose-400">{exportError}</p>}

      {showExtras && <ResumenExtrasPanel desde={desde || undefined} hasta={hasta || undefined} />}

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
