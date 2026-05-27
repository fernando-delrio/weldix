import { useEffect, useState } from 'react'
import AppShell from '../../core/components/AppShell'
import WeldixButton from '../../core/components/WeldixButton'
import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { useRrhh } from '../hooks/useRrhh'
import { cx } from '../../core/lib/cx'
import { useIaContext } from '../../ia/lib/IaContext'
import NominasAdminSection from './NominasAdminSection'
import MisNominasSection from './MisNominasSection'

// ── Estrategia de colores por estado ─────────────────────────────────────────
const ESTADO_CONFIG = {
  pendiente: { label: 'Pendiente', badge: 'border-amber-700/50  bg-amber-400/10  text-amber-300' },
  aprobada: {
    label: 'Aprobada',
    badge: 'border-emerald-700/50 bg-emerald-500/10 text-emerald-300',
  },
  rechazada: { label: 'Rechazada', badge: 'border-rose-700/50   bg-rose-500/10   text-rose-300' },
  cancelada: { label: 'Cancelada', badge: 'border-slate-700/50  bg-slate-700/20  text-slate-500' },
}
const getEstadoConfig = (estado) => ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.pendiente

const cardBase = 'rounded-xl border border-cyan-900/50 bg-slate-900/65 p-4'
const inputBase =
  'w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 placeholder:text-slate-600'
const labelBase =
  'block text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1'

// ── Utilidad: contar días laborables (L-V) entre dos fechas ───────────────────
const contarDiasLaborables = (inicio, fin) => {
  if (!inicio || !fin) return 0
  const start = new Date(inicio + 'T00:00:00')
  const end = new Date(fin + 'T00:00:00')
  if (start > end) return 0
  let count = 0
  const d = new Date(start)
  while (d <= end) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

// ⚠️ No usar toISOString() — devuelve UTC y en España (UTC+2) el lunes local
// se convierte a domingo UTC, rompiendo el detector de fin de semana.
const toDateStr = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const hoyStr = () => toDateStr(new Date())

// ── Calendario de rango ───────────────────────────────────────────────────────
const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']
const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const buildGrid = (year, month) => {
  // Primer día del mes (0=dom…6=sab), convertido a base lunes
  const firstDay = new Date(year, month, 1)
  const startDow = (firstDay.getDay() + 6) % 7 // 0=lunes … 6=domingo
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const total = Math.ceil((startDow + daysInMonth) / 7) * 7
  return Array.from({ length: total }, (_, i) => {
    const day = i - startDow + 1
    return day >= 1 && day <= daysInMonth ? toDateStr(new Date(year, month, day)) : null
  })
}

const RangeCalendar = ({ inicio, fin, onRangeChange }) => {
  const hoy = new Date()
  const [mes, setMes] = useState({ year: hoy.getFullYear(), month: hoy.getMonth() })
  const [hover, setHover] = useState(null)

  const prevMes = () =>
    setMes(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    )
  const nextMes = () =>
    setMes(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    )

  const handleClick = (dateStr) => {
    // Si no hay inicio, o ya hay ambos → empieza nuevo rango
    if (!inicio || (inicio && fin)) {
      onRangeChange(dateStr, null)
      return
    }
    // Si el click es antes del inicio → intercambia
    if (dateStr < inicio) {
      onRangeChange(dateStr, inicio)
      return
    }
    onRangeChange(inicio, dateStr)
  }

  const previewFin = fin ?? hover
  const rangeStart = inicio && previewFin ? (inicio < previewFin ? inicio : previewFin) : inicio
  const rangeEnd = inicio && previewFin ? (inicio < previewFin ? previewFin : inicio) : null

  const grid = buildGrid(mes.year, mes.month)
  const hoyS = hoyStr()

  const cellClass = (dateStr) => {
    if (!dateStr) return ''
    const isStart = dateStr === inicio
    const isEnd = dateStr === fin
    const isEndpoint = isStart || isEnd
    const inRange = rangeStart && rangeEnd && dateStr > rangeStart && dateStr < rangeEnd
    const isHoverFin = !fin && dateStr === hover
    const isPast = dateStr < hoyS
    const isHoy = dateStr === hoyS
    const isWeekend = (() => {
      const d = new Date(dateStr + 'T00:00:00')
      return d.getDay() === 0 || d.getDay() === 6
    })()

    return cx(
      'relative flex h-8 w-full items-center justify-center rounded-lg text-xs font-semibold transition select-none',
      isPast && !isEndpoint ? 'text-slate-700 cursor-default' : 'cursor-pointer',
      !isPast &&
        !isEndpoint &&
        !inRange &&
        !isHoverFin &&
        !isWeekend &&
        'hover:bg-slate-700 text-slate-300',
      isWeekend && !isEndpoint && !inRange ? 'text-slate-600' : '',
      inRange && 'bg-sky-500/15 text-sky-200 rounded-none',
      isHoverFin && !fin && 'bg-sky-500/10 text-sky-300',
      isHoy && !isEndpoint ? 'ring-1 ring-sky-500 text-sky-300' : '',
      isEndpoint && 'bg-sky-500 text-white shadow-md shadow-sky-900/50 z-10'
    )
  }

  // Estilo del rango: quita bordes redondeados en extremos que están dentro del rango
  const wrapClass = (dateStr, idx) => {
    if (!dateStr || !rangeStart || !rangeEnd) return ''
    const inRange = dateStr >= rangeStart && dateStr <= rangeEnd
    if (!inRange) return ''
    const isStart = dateStr === rangeStart
    const isEnd = dateStr === rangeEnd
    const col = idx % 7
    return cx(
      'bg-sky-500/10',
      isStart && 'rounded-l-lg',
      isEnd && 'rounded-r-lg',
      !isStart && !isEnd && col === 0 && 'rounded-l-lg',
      !isStart && !isEnd && col === 6 && 'rounded-r-lg'
    )
  }

  return (
    <div className="select-none">
      {/* Cabecera del mes */}
      <div className="mb-3 flex items-center justify-between">
        <WeldixButton
          variant="ghost"
          size="icon"
          onClick={prevMes}
          aria-label="Mes anterior"
          className="h-11 w-11 border border-slate-700"
        >
          ‹
        </WeldixButton>
        <span className="text-sm font-bold text-slate-100">
          {MESES[mes.month]} {mes.year}
        </span>
        <WeldixButton
          variant="ghost"
          size="icon"
          onClick={nextMes}
          aria-label="Mes siguiente"
          className="h-11 w-11 border border-slate-700"
        >
          ›
        </WeldixButton>
      </div>

      {/* Cabecera días semana */}
      <div className="mb-1 grid grid-cols-7">
        {DIAS_SEMANA.map((d) => (
          <div
            key={d}
            className="text-center text-[0.6rem] font-bold uppercase tracking-wider text-slate-600"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid días */}
      <div className="grid grid-cols-7">
        {grid.map((dateStr, idx) => (
          <div key={idx} className={wrapClass(dateStr, idx)}>
            {dateStr ? (
              <div
                className={cellClass(dateStr)}
                onClick={() => handleClick(dateStr)}
                onMouseEnter={() => inicio && !fin && setHover(dateStr)}
                onMouseLeave={() => setHover(null)}
              >
                {new Date(dateStr + 'T00:00:00').getDate()}
              </div>
            ) : (
              <div className="h-8 w-full" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Contador de días seleccionados ────────────────────────────────────────────
const ContadorDias = ({ inicio, fin, saldo }) => {
  const diasSel = contarDiasLaborables(inicio, fin)
  const restantes = saldo ? saldo.dias_disponibles - diasSel : null

  const noHayRango = !inicio || !fin

  return (
    <div
      className={cx(
        'rounded-xl border p-3 transition',
        noHayRango
          ? 'border-slate-800 bg-slate-800/30'
          : restantes !== null && restantes < 0
            ? 'border-rose-800/50 bg-rose-500/5'
            : 'border-sky-800/50 bg-sky-500/5'
      )}
    >
      {noHayRango ? (
        <p className="text-center text-xs text-slate-600">
          {!inicio ? 'Selecciona el día de inicio' : 'Ahora selecciona el día de fin'}
        </p>
      ) : (
        <div className="flex items-center justify-around">
          <div className="text-center">
            <p
              className={cx(
                'text-2xl font-bold',
                restantes !== null && restantes < 0 ? 'text-rose-400' : 'text-sky-300'
              )}
            >
              {diasSel}
            </p>
            <p className="text-[0.6rem] uppercase tracking-wider text-slate-500">Días laborables</p>
          </div>
          {saldo && (
            <>
              <div className="h-8 w-px bg-slate-700" />
              <div className="text-center">
                <p
                  className={cx(
                    'text-2xl font-bold',
                    restantes < 0 ? 'text-rose-400' : 'text-emerald-400'
                  )}
                >
                  {restantes}
                </p>
                <p className="text-[0.6rem] uppercase tracking-wider text-slate-500">
                  Días restantes
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Saldo de vacaciones ───────────────────────────────────────────────────────
const SaldoCard = ({ saldo }) => {
  if (!saldo) return null
  return (
    <div className="rounded-xl border border-sky-900/50 bg-sky-500/5 p-4">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-sky-400 mb-3">
        Vacaciones {saldo.year}
      </p>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-2xl font-bold text-slate-100">{saldo.dias_disponibles}</p>
          <p className="text-[0.6rem] text-slate-500 uppercase tracking-wider">Disponibles</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-100">{saldo.dias_totales}</p>
          <p className="text-[0.6rem] text-slate-500 uppercase tracking-wider">Totales</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-emerald-400">{saldo.dias_aprobados}</p>
          <p className="text-[0.6rem] text-slate-500 uppercase tracking-wider">Aprobados</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-amber-400">{saldo.dias_pendientes}</p>
          <p className="text-[0.6rem] text-slate-500 uppercase tracking-wider">Pendientes</p>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de solicitud ──────────────────────────────────────────────────────
const SolicitudCard = ({ solicitud, onCancelar, onRevisar, isAdmin }) => {
  const cfg = getEstadoConfig(solicitud.estado)
  const dias = solicitud.dias_solicitados

  return (
    <div className={cx(cardBase, 'flex flex-col gap-2')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-100">{solicitud.tipo_label}</p>
          {isAdmin && solicitud.operario_nombre && (
            <p className="text-[0.68rem] text-slate-500">{solicitud.operario_nombre}</p>
          )}
          <p className="text-[0.68rem] text-slate-400 mt-0.5">
            {solicitud.fecha_inicio} → {solicitud.fecha_fin}
            <span className="ml-2 text-slate-500">
              ({dias} día{dias !== 1 ? 's' : ''})
            </span>
          </p>
        </div>
        <span
          className={cx(
            'shrink-0 rounded-md border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest',
            cfg.badge
          )}
        >
          {cfg.label}
        </span>
      </div>

      {solicitud.motivo && <p className="text-xs text-slate-500 italic">"{solicitud.motivo}"</p>}
      {solicitud.comentario_admin && (
        <p className="text-xs text-sky-400/80">Admin: {solicitud.comentario_admin}</p>
      )}

      <div className="flex gap-2 pt-1">
        {!isAdmin && solicitud.estado === 'pendiente' && (
          <WeldixButton variant="danger" size="sm" onClick={() => onCancelar(solicitud.id)}>
            Cancelar solicitud
          </WeldixButton>
        )}
        {isAdmin && solicitud.estado === 'pendiente' && (
          <WeldixButton variant="primary" size="sm" onClick={() => onRevisar(solicitud.id)}>
            Revisar
          </WeldixButton>
        )}
      </div>
    </div>
  )
}

// ── Modal de nueva solicitud con calendario ───────────────────────────────────
const NuevaSolicitudModal = ({ tipos, saldo, onClose, onSubmit, isSubmitting, error }) => {
  const [tipo, setTipo] = useState(tipos[0]?.valor ?? '')
  const [fechaInicio, setFechaInicio] = useState(null)
  const [fechaFin, setFechaFin] = useState(null)
  const [motivo, setMotivo] = useState('')

  const handleRangeChange = (inicio, fin) => {
    setFechaInicio(inicio)
    setFechaFin(fin)
  }

  // Solo mostrar contador de días restantes si el tipo es vacaciones
  const tipoSeleccionado = tipos.find((t) => t.valor === tipo)
  const esVacaciones = tipo === 'vacaciones'
  const saldoParaMostrar = esVacaciones ? saldo : null

  const isValid = fechaInicio && fechaFin
  const diasSel = contarDiasLaborables(fechaInicio, fechaFin)
  const sinSaldo = esVacaciones && saldo && diasSel > saldo.dias_disponibles

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isValid) return
    onSubmit({ tipo, fecha_inicio: fechaInicio, fecha_fin: fechaFin, motivo })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Nueva solicitud</h2>
          <WeldixButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar modal de nueva solicitud"
            className="h-11 w-11 border border-slate-700"
          >
            ✕
          </WeldixButton>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de ausencia */}
          <div>
            <label className={labelBase}>Tipo de ausencia *</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputBase}>
              {tipos.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.label}
                </option>
              ))}
            </select>
            {tipoSeleccionado?.requiere_justificante && (
              <p className="mt-1 text-[0.62rem] text-amber-400">
                Este tipo requiere justificante (podrás adjuntarlo después)
              </p>
            )}
          </div>

          {/* Calendario de rango */}
          <div>
            <label className={labelBase}>Selecciona las fechas</label>
            <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-4">
              <RangeCalendar
                inicio={fechaInicio}
                fin={fechaFin}
                onRangeChange={handleRangeChange}
              />
            </div>
          </div>

          {/* Contador */}
          <ContadorDias inicio={fechaInicio} fin={fechaFin} saldo={saldoParaMostrar} />

          {/* Motivo */}
          <div>
            <label className={labelBase}>
              Motivo <span className="text-slate-600 normal-case">(opcional)</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Describe el motivo si lo deseas..."
              className={cx(inputBase, 'resize-none')}
            />
          </div>

          {(error || sinSaldo) && (
            <p className="text-xs text-rose-400">
              {sinSaldo
                ? `No tienes días suficientes. Disponibles: ${saldo.dias_disponibles}`
                : error}
            </p>
          )}

          <WeldixButton
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            loadingLabel="Enviando solicitud…"
            disabled={!isValid || sinSaldo}
            className="w-full"
          >
            {isValid ? `Enviar solicitud (${diasSel}d)` : 'Selecciona las fechas'}
          </WeldixButton>
        </form>
      </div>
    </div>
  )
}

// ── Modal de revisión (admin) ─────────────────────────────────────────────────
const RevisarModal = ({ solicitud, onClose, onSubmit, isSubmitting, error }) => {
  const [form, setForm] = useState({ estado: 'aprobada', comentario_admin: '' })
  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(solicitud.id, form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[480px] rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Revisar solicitud</h2>
          <WeldixButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar modal de revisión"
            className="h-11 w-11 border border-slate-700"
          >
            ✕
          </WeldixButton>
        </div>

        <div className={cx(cardBase, 'mb-4')}>
          <p className="text-sm font-bold text-slate-100">{solicitud.tipo_label}</p>
          <p className="text-xs text-slate-400 mt-1">{solicitud.operario_nombre}</p>
          <p className="text-xs text-slate-400">
            {solicitud.fecha_inicio} → {solicitud.fecha_fin} · {solicitud.dias_solicitados} días
          </p>
          {solicitud.motivo && (
            <p className="text-xs text-slate-500 italic mt-1">"{solicitud.motivo}"</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <WeldixButton
              variant={form.estado === 'aprobada' ? 'success' : 'secondary'}
              onClick={() => setForm((p) => ({ ...p, estado: 'aprobada' }))}
              aria-pressed={form.estado === 'aprobada'}
              className="w-full"
            >
              Aprobar
            </WeldixButton>
            <WeldixButton
              variant={form.estado === 'rechazada' ? 'danger' : 'secondary'}
              onClick={() => setForm((p) => ({ ...p, estado: 'rechazada' }))}
              aria-pressed={form.estado === 'rechazada'}
              className="w-full"
            >
              Rechazar
            </WeldixButton>
          </div>
          <div>
            <label className={labelBase}>
              Comentario <span className="text-slate-600 normal-case">(opcional)</span>
            </label>
            <textarea
              value={form.comentario_admin}
              onChange={setField('comentario_admin')}
              rows={2}
              maxLength={500}
              placeholder="Razón de la decisión..."
              className={cx(inputBase, 'resize-none')}
            />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-sm font-bold text-white transition hover:from-sky-400 hover:to-blue-500 disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando...' : 'Confirmar decisión'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Guard clauses ─────────────────────────────────────────────────────────────
const loadingState = ({ isLoading }) =>
  isLoading && (
    <div className="space-y-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className={cx(cardBase, 'h-20 animate-pulse')} />
      ))}
    </div>
  )

const errorState = ({ error }) =>
  error && (
    <p className="rounded-lg border border-rose-800/50 bg-rose-500/10 p-3 text-sm text-rose-400">
      {error}
    </p>
  )

const emptyState = ({ solicitudes, isLoading }) =>
  !isLoading &&
  solicitudes.length === 0 && (
    <div className={cx(cardBase, 'py-8 text-center')}>
      <p className="text-sm text-slate-500">No hay solicitudes todavía.</p>
    </div>
  )

// ── Filtro de estado ──────────────────────────────────────────────────────────
const FILTROS = ['todos', 'pendiente', 'aprobada', 'rechazada', 'cancelada']

const FiltroEstado = ({ filtro, onChange }) => (
  <div className="flex gap-2 overflow-x-auto pb-1">
    {FILTROS.map((f) => (
      <button
        key={f}
        type="button"
        onClick={() => onChange(f)}
        className={cx(
          'shrink-0 rounded-full border px-3 py-1 text-[0.62rem] font-bold uppercase tracking-widest transition',
          filtro === f
            ? 'border-sky-500 bg-sky-500/20 text-sky-300'
            : 'border-slate-700 bg-slate-800/40 text-slate-500 hover:border-slate-600 hover:text-slate-400'
        )}
      >
        {f === 'todos' ? 'Todos' : getEstadoConfig(f).label}
      </button>
    ))}
  </div>
)

// ── Componente principal ──────────────────────────────────────────────────────
const RrhhPage = () => {
  const { profile } = useAuthSession()
  const isAdmin = profile?.role === 'admin'
  const [filtro, setFiltro] = useState('todos')
  const { setPageContext } = useIaContext()

  const {
    saldo,
    solicitudes,
    tipos,
    pendientes,
    isLoading,
    isSubmitting,
    error,
    modalCrear,
    setModalCrear,
    revisandoId,
    setRevisandoId,
    crear,
    cancelar,
    revisar,
  } = useRrhh({ isAdmin })

  // Inyectar contexto RRHH en la IA al cargar los datos
  useEffect(() => {
    const sugerenciasOperario = [
      '¿Cuántos días de vacaciones me quedan?',
      '¿Cómo solicito un permiso por matrimonio?',
      '¿Qué días de permiso tengo si nace mi hijo?',
      '¿Puedo cancelar una solicitud ya enviada?',
    ]
    const sugerenciasAdmin = [
      `¿Cuántas solicitudes están pendientes de revisión?`,
      '¿Qué criterio sigo para aprobar o rechazar vacaciones?',
      '¿Cuántos días mínimos reconoce el convenio anualmente?',
      '¿Cómo gestionar el solapamiento de vacaciones en el equipo?',
    ]

    if (!isAdmin && saldo) {
      setPageContext({
        seccion: 'RRHH — Vacaciones',
        resumen: `Saldo ${saldo.year}: ${saldo.dias_disponibles} días disponibles de ${saldo.dias_totales} (${saldo.dias_aprobados} aprobados, ${saldo.dias_pendientes} pendientes). Solicitudes totales: ${solicitudes.length}.`,
        sugerencias: sugerenciasOperario,
      })
    } else if (isAdmin) {
      setPageContext({
        seccion: 'RRHH — Gestión de ausencias',
        resumen: `Solicitudes pendientes de revisión: ${pendientes.length}. Total solicitudes: ${solicitudes.length}.`,
        sugerencias: sugerenciasAdmin,
      })
    }
    return () => setPageContext(null)
  }, [isAdmin, saldo, solicitudes.length, pendientes.length, setPageContext])

  const solicitudesFiltradas =
    filtro === 'todos' ? solicitudes : solicitudes.filter((s) => s.estado === filtro)

  const solicitudRevisando = solicitudes.find((s) => s.id === revisandoId) ?? null

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[720px] space-y-4 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              {isAdmin ? 'Recursos Humanos' : 'Mis ausencias'}
            </h1>
            <p className="text-xs text-slate-500">
              {isAdmin
                ? `${pendientes.length} pendiente${pendientes.length !== 1 ? 's' : ''} de revisión`
                : 'Vacaciones y permisos'}
            </p>
          </div>
          {!isAdmin && (
            <button
              type="button"
              onClick={() => setModalCrear(true)}
              className="rounded-xl border border-sky-700/50 bg-sky-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-sky-300 transition hover:bg-sky-500/20"
            >
              + Nueva solicitud
            </button>
          )}
        </div>

        {!isAdmin && <SaldoCard saldo={saldo} />}

        {isAdmin && pendientes.length > 0 && (
          <div className="rounded-xl border border-amber-700/50 bg-amber-400/5 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
              {pendientes.length} solicitud{pendientes.length !== 1 ? 'es' : ''} esperando revisión
            </p>
          </div>
        )}

        <FiltroEstado filtro={filtro} onChange={setFiltro} />

        {errorState({ error })}
        {loadingState({ isLoading })}
        {emptyState({ solicitudes: solicitudesFiltradas, isLoading })}

        {!isLoading &&
          solicitudesFiltradas.map((s) => (
            <SolicitudCard
              key={s.id}
              solicitud={s}
              isAdmin={isAdmin}
              onCancelar={cancelar}
              onRevisar={setRevisandoId}
            />
          ))}

        {/* ── Nóminas ────────────────────────────────────────────────────── */}
        <div className="pt-4 border-t border-slate-700/50">
          <h2 className="text-base font-bold tracking-tight text-slate-100 mb-4 flex items-center gap-2">
            <i className="bx bxs-file-pdf text-rose-400" aria-hidden="true" />
            Nóminas
          </h2>
          {isAdmin ? <NominasAdminSection /> : <MisNominasSection />}
        </div>
      </div>

      {modalCrear && (
        <NuevaSolicitudModal
          tipos={tipos}
          saldo={saldo}
          onClose={() => setModalCrear(false)}
          onSubmit={crear}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}

      {solicitudRevisando && (
        <RevisarModal
          solicitud={solicitudRevisando}
          onClose={() => setRevisandoId(null)}
          onSubmit={revisar}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}
    </AppShell>
  )
}

export default RrhhPage
