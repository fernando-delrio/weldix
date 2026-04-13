import { useCallback, useEffect, useState } from 'react'
import { getMisJornadas } from '../services/fichajeService'

const DIAS_SEMANA  = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MESES        = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const fmtHoras = (h) => {
  const hrs  = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return hrs > 0 ? `${hrs}h ${mins}min` : `${mins}min`
}

// Agrupa los fichajes en un mapa { "YYYY-MM-DD": { horas, abierto } }
// Usa fecha LOCAL para que el día cuadre con lo que ve el operario
const buildDayMap = (fichajes) =>
  fichajes.reduce((acc, f) => {
    const d   = new Date(f.inicio)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const prev = acc[key] ?? { horas: 0, abierto: false }
    return {
      ...acc,
      [key]: {
        horas:   prev.horas + (f.fin !== null ? (f.horas ?? 0) : 0),
        abierto: prev.abierto || f.fin === null,
      },
    }
  }, {})

// Primer día de la semana del mes (0=lun … 6=dom, ajustado para que lunes sea índice 0)
const primerDiaSemana = (year, month) => {
  const d = new Date(year, month, 1).getDay()
  // getDay: 0=dom, 1=lun … 6=sáb → queremos 0=lun … 6=dom
  return d === 0 ? 6 : d - 1
}

const diasEnMes = (year, month) => new Date(year, month + 1, 0).getDate()

// Color del día según horas trabajadas
const colorDia = ({ horas, abierto }) => {
  const enCurso  = ({ abierto })       => abierto && 'ring-1 ring-sky-400/60 bg-sky-500/10 text-sky-300'
  const completo = ({ horas })         => horas >= 8 && 'bg-emerald-500/20 text-emerald-300'
  const parcial  = ({ horas })         => horas > 0 && horas < 8 && 'bg-amber-500/15 text-amber-300'
  return enCurso({ abierto }) || completo({ horas }) || parcial({ horas }) || ''
}

// ── Leyenda ───────────────────────────────────────────────────────────────────
const Leyenda = () => (
  <div className="flex items-center gap-3 text-[0.6rem] uppercase tracking-widest text-slate-500">
    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500/60" /> ≥ 8h</span>
    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500/60" /> {'< 8h'}</span>
    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500/60" /> En curso</span>
  </div>
)

// ── Celda de día ──────────────────────────────────────────────────────────────
const DiaCelda = ({ dia, datos, isHoy }) => {
  const extra    = datos ? colorDia(datos) : ''
  const hoyRing  = isHoy ? 'ring-1 ring-slate-400' : ''
  const sinDatos = !datos ? 'text-slate-600' : ''

  return (
    <div
      className={`relative flex h-9 w-full flex-col items-center justify-center rounded-lg text-xs font-semibold transition ${extra} ${hoyRing} ${sinDatos}`}
      title={datos ? `${fmtHoras(datos.horas)}${datos.abierto ? ' (en curso)' : ''}` : ''}
    >
      {dia}
      {datos && datos.horas > 0 && (
        <span className="absolute bottom-0.5 text-[0.48rem] leading-none opacity-70">
          {fmtHoras(datos.horas)}
        </span>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
const FichajeCalendar = () => {
  const hoy   = new Date()
  const [year,  setYear]    = useState(hoy.getFullYear())
  const [month, setMonth]   = useState(hoy.getMonth())
  const [dayMap, setDayMap] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]   = useState(null)

  const cargar = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getMisJornadas()
      setDayMap(buildDayMap(data))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const irMesAnterior = () => {
    const d = new Date(year, month - 1, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const irMesSiguiente = () => {
    const d = new Date(year, month + 1, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const totalDias   = diasEnMes(year, month)
  const offsetInicio = primerDiaSemana(year, month)
  // Celdas vacías al inicio + días del mes
  const celdas = [
    ...Array.from({ length: offsetInicio }, (_, i) => ({ tipo: 'vacio', key: `v-${i}` })),
    ...Array.from({ length: totalDias },     (_, i) => ({ tipo: 'dia',   dia: i + 1, key: `d-${i + 1}` })),
  ]

  return (
    <section className="rounded-xl border border-cyan-900/50 bg-slate-900/65 p-5">
      {/* Cabecera del mes */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={irMesAnterior}
          className="grid h-7 w-7 place-items-center rounded-lg border border-slate-700 text-slate-400 transition hover:text-slate-200"
        >
          ‹
        </button>
        <p className="text-sm font-bold text-slate-200">
          {MESES[month]} {year}
        </p>
        <button
          type="button"
          onClick={irMesSiguiente}
          className="grid h-7 w-7 place-items-center rounded-lg border border-slate-700 text-slate-400 transition hover:text-slate-200"
        >
          ›
        </button>
      </div>

      {/* Días de la semana */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map((d) => (
          <p key={d} className="text-center text-[0.6rem] font-bold uppercase tracking-widest text-slate-600">{d}</p>
        ))}
      </div>

      {/* Grid del mes */}
      {isLoading
        ? <div className="h-40 animate-pulse rounded-lg bg-slate-800" />
        : error
          ? <p className="text-sm text-rose-400">{error}</p>
          : (
            <div className="grid grid-cols-7 gap-1">
              {celdas.map((c) => (
                c.tipo === 'vacio'
                  ? <div key={c.key} />
                  : (
                    <DiaCelda
                      key={c.key}
                      dia={c.dia}
                      datos={dayMap[`${year}-${String(month + 1).padStart(2, '0')}-${String(c.dia).padStart(2, '0')}`]}
                      isHoy={year === hoy.getFullYear() && month === hoy.getMonth() && c.dia === hoy.getDate()}
                    />
                  )
              ))}
            </div>
          )
      }

      <div className="mt-3 border-t border-slate-800 pt-3">
        <Leyenda />
      </div>
    </section>
  )
}

export default FichajeCalendar
