import { useEffect, useRef, useState } from 'react'
import { cx } from '../../core/lib/cx'
import WeldixButton from '../../core/components/WeldixButton'
import { useNominasAdmin } from '../hooks/useNominas'
import { getOperarios } from '../services/nominasService'

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

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i)

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500'
const labelCls = 'block text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1'

// ── Fila de nómina ────────────────────────────────────────────────────────────

const NominaRow = ({ nomina, onDelete, onDownload }) => (
  <div className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/50 px-4 py-2.5 text-sm">
    <div className="flex items-center gap-3 min-w-0">
      <i className="bx bxs-file-pdf text-rose-400 text-lg shrink-0" />
      <div className="min-w-0">
        <p className="font-medium text-slate-100 truncate">{nomina.operario_nombre}</p>
        <p className="text-[0.7rem] text-slate-500">
          {nomina.month_label} {nomina.year}
        </p>
      </div>
    </div>
    <div className="flex gap-2 shrink-0 ml-3">
      <button
        onClick={() => onDownload(nomina)}
        aria-label={`Descargar nómina ${nomina.month_label} ${nomina.year}`}
        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-sky-400 hover:bg-sky-500/10 transition"
      >
        <i className="bx bx-download text-base" />
      </button>
      <button
        onClick={() => onDelete(nomina.id)}
        aria-label={`Eliminar nómina ${nomina.month_label} ${nomina.year}`}
        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
      >
        <i className="bx bx-trash text-base" />
      </button>
    </div>
  </div>
)

// ── Formulario de subida ──────────────────────────────────────────────────────

const UploadForm = ({ operarios, onUpload, uploading, uploadError }) => {
  const [operarioId, setOperarioId] = useState('')
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [file, setFile] = useState(null)
  const fileRef = useRef(null)

  const isValid = operarioId && file

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return
    const ok = await onUpload({
      operarioId: Number(operarioId),
      year: Number(year),
      month: Number(month),
      file,
    })
    if (ok) {
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-cyan-900/50 bg-slate-900/60 p-4 space-y-3"
    >
      <h3 className="text-[0.75rem] font-bold uppercase tracking-widest text-slate-400">
        Subir nómina
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="nomina-operario" className={labelCls}>
            Operario
          </label>
          <select
            id="nomina-operario"
            value={operarioId}
            onChange={(e) => setOperarioId(e.target.value)}
            className={cx(inputCls, 'cursor-pointer')}
            required
          >
            <option value="">Selecciona operario</option>
            {operarios.map((op) => (
              <option key={op.id} value={op.id}>
                {op.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="nomina-month" className={labelCls}>
            Mes
          </label>
          <select
            id="nomina-month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className={cx(inputCls, 'cursor-pointer')}
          >
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="nomina-year" className={labelCls}>
            Año
          </label>
          <select
            id="nomina-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className={cx(inputCls, 'cursor-pointer')}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="nomina-file" className={labelCls}>
          PDF de la nómina
        </label>
        <input
          id="nomina-file"
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-sky-500 cursor-pointer"
          required
        />
        {file && (
          <p className="mt-1 text-[0.7rem] text-slate-500">
            <i className="bx bxs-file-pdf text-rose-400 mr-1" />
            {file.name} — {(file.size / 1024).toFixed(0)} KB
          </p>
        )}
      </div>

      {uploadError && <p className="text-xs text-rose-400">{uploadError}</p>}

      <WeldixButton
        type="submit"
        disabled={!isValid || uploading}
        aria-busy={uploading}
        className="w-full sm:w-auto"
      >
        {uploading ? (
          <>
            <i className="bx bx-loader-alt animate-spin mr-1.5" />
            Subiendo...
          </>
        ) : (
          <>
            <i className="bx bx-upload mr-1.5" />
            Subir nómina
          </>
        )}
      </WeldixButton>
    </form>
  )
}

// ── Sección principal ─────────────────────────────────────────────────────────

const NominasAdminSection = () => {
  const [operarios, setOperarios] = useState([])
  const [filterOperarioId, setFilterOperarioId] = useState('')
  const [filterYear, setFilterYear] = useState('')

  const {
    nominas,
    isLoading,
    error,
    uploading,
    uploadError,
    handleUpload,
    handleDelete,
    handleDescargar,
  } = useNominasAdmin({
    operarioId: filterOperarioId || undefined,
    year: filterYear || undefined,
  })

  useEffect(() => {
    getOperarios()
      .then(setOperarios)
      .catch(() => {})
  }, [])

  const nominasFiltradas = nominas

  return (
    <section className="space-y-4">
      <UploadForm
        operarios={operarios}
        onUpload={handleUpload}
        uploading={uploading}
        uploadError={uploadError}
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterOperarioId}
          onChange={(e) => setFilterOperarioId(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-sky-500 cursor-pointer"
          aria-label="Filtrar por operario"
        >
          <option value="">Todos los operarios</option>
          {operarios.map((op) => (
            <option key={op.id} value={op.id}>
              {op.full_name}
            </option>
          ))}
        </select>

        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-sky-500 cursor-pointer"
          aria-label="Filtrar por año"
        >
          <option value="">Todos los años</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {isLoading && <p className="text-sm text-slate-500">Cargando nóminas...</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {!isLoading && !error && nominasFiltradas.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700/60 p-6 text-center">
          <i className="bx bxs-file-pdf text-2xl text-slate-600 mb-2 block" />
          <p className="text-sm text-slate-500">Aún no hay nóminas subidas.</p>
        </div>
      )}
      {!isLoading && !error && nominasFiltradas.length > 0 && (
        <div className="space-y-2">
          {nominasFiltradas.map((n) => (
            <NominaRow key={n.id} nomina={n} onDelete={handleDelete} onDownload={handleDescargar} />
          ))}
        </div>
      )}
    </section>
  )
}

export default NominasAdminSection
