import { useState } from 'react'
import { useMisNominas } from '../hooks/useNominas'

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i)

// ── Fila de nómina ────────────────────────────────────────────────────────────

const NominaRow = ({ nomina, onDownload }) => (
  <div className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/50 px-4 py-3">
    <div className="flex items-center gap-3">
      <i className="bx bxs-file-pdf text-rose-400 text-xl shrink-0" />
      <div>
        <p className="text-sm font-semibold text-slate-100">
          {nomina.month_label} {nomina.year}
        </p>
        <p className="text-[0.7rem] text-slate-500">
          Subida el {new Date(nomina.uploaded_at).toLocaleDateString('es-ES')}
        </p>
      </div>
    </div>
    <button
      onClick={() => onDownload(nomina)}
      aria-label={`Descargar nómina de ${nomina.month_label} ${nomina.year}`}
      className="flex items-center gap-1.5 rounded-lg border border-sky-700/50 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20 min-h-[36px]"
    >
      <i className="bx bx-download text-sm" />
      Descargar
    </button>
  </div>
)

// ── Sección principal ─────────────────────────────────────────────────────────

const MisNominasSection = () => {
  const [selectedYear, setSelectedYear] = useState('')
  const { nominas, isLoading, error, handleDescargar } = useMisNominas(
    selectedYear ? Number(selectedYear) : undefined
  )

  return (
    <section className="space-y-4">
      {/* Selector de año */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="mis-nominas-year"
          className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500"
        >
          Año
        </label>
        <select
          id="mis-nominas-year"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500 cursor-pointer"
        >
          <option value="">Todos los años</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Estados */}
      {isLoading && <p className="text-sm text-slate-500">Cargando nóminas...</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {!isLoading && !error && nominas.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700/60 p-8 text-center">
          <i className="bx bxs-file-pdf text-3xl text-slate-600 mb-2 block" />
          <p className="text-sm font-medium text-slate-400">Sin nóminas disponibles</p>
          <p className="text-xs text-slate-600 mt-1">
            {selectedYear
              ? `No hay nóminas del año ${selectedYear}.`
              : 'Tu empresa aún no ha subido ninguna nómina.'}
          </p>
        </div>
      )}
      {!isLoading && !error && nominas.length > 0 && (
        <div className="space-y-2">
          {nominas.map((n) => (
            <NominaRow key={n.id} nomina={n} onDownload={handleDescargar} />
          ))}
        </div>
      )}
    </section>
  )
}

export default MisNominasSection
