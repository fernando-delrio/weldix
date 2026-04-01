import { useCallback, useEffect, useState } from 'react'
import { getTodosLosFichajes } from '../services/fichajeService'

const cardBase = 'rounded-xl border border-cyan-900/50 bg-slate-900/65'

// Formatea una fecha ISO como "31 mar · 09:15"
const formatFecha = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const estadoBadge = (fichaje) => {
  const abierto = fichaje.fin === null
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-widest ${
      abierto
        ? 'border-emerald-700/50 bg-emerald-500/10 text-emerald-300'
        : 'border-slate-700/50 bg-slate-800/50 text-slate-500'
    }`}>
      {abierto ? 'En jornada' : `${fichaje.horas}h`}
    </span>
  )
}

const FilaFichaje = ({ fichaje }) => (
  <tr className="border-b border-slate-800/60 last:border-0">
    <td className="py-3 pr-4 text-sm font-semibold text-slate-200">{fichaje.operario_nombre ?? '—'}</td>
    <td className="py-3 pr-4 text-xs text-slate-400">{formatFecha(fichaje.inicio)}</td>
    <td className="py-3 pr-4 text-xs text-slate-500">{fichaje.fin ? formatFecha(fichaje.fin) : '—'}</td>
    <td className="py-3">{estadoBadge(fichaje)}</td>
  </tr>
)

/**
 * Sección de fichajes para el panel de admin.
 * Muestra una tabla con las últimas jornadas de todos los operarios.
 */
const FichajesAdminSection = () => {
  const [fichajes,  setFichajes]  = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState(null)

  const cargar = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getTodosLosFichajes()
      setFichajes(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Operarios con jornada activa — se muestran primero
  const activos = fichajes.filter((f) => f.fin === null)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[0.64rem] font-bold uppercase tracking-[0.2em] text-sky-300">
          Fichajes de jornada
        </p>
        {activos.length > 0 && (
          <span className="rounded-md border border-emerald-700/50 bg-emerald-500/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-emerald-300">
            {activos.length} en jornada ahora
          </span>
        )}
      </div>

      <div className={cardBase}>
        {isLoading && (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((n) => <div key={n} className="h-4 animate-pulse rounded bg-slate-800" />)}
          </div>
        )}

        {error && <p className="p-4 text-sm text-rose-400">{error}</p>}

        {!isLoading && fichajes.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Sin fichajes registrados aún.</p>
        )}

        {!isLoading && fichajes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-0 py-2.5 pr-4 text-left text-[0.62rem] font-bold uppercase tracking-widest text-slate-500 pl-4">Operario</th>
                  <th className="py-2.5 pr-4 text-left text-[0.62rem] font-bold uppercase tracking-widest text-slate-500">Entrada</th>
                  <th className="py-2.5 pr-4 text-left text-[0.62rem] font-bold uppercase tracking-widest text-slate-500">Salida</th>
                  <th className="py-2.5 text-left text-[0.62rem] font-bold uppercase tracking-widest text-slate-500 pr-4">Estado</th>
                </tr>
              </thead>
              <tbody className="pl-4">
                {fichajes.map((f) => (
                  <tr key={f.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="py-3 pr-4 pl-4 text-sm font-semibold text-slate-200">{f.operario_nombre ?? '—'}</td>
                    <td className="py-3 pr-4 text-xs text-slate-400">{formatFecha(f.inicio)}</td>
                    <td className="py-3 pr-4 text-xs text-slate-500">{f.fin ? formatFecha(f.fin) : '—'}</td>
                    <td className="py-3 pr-4">{estadoBadge(f)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default FichajesAdminSection
