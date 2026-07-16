import { Link, useSearchParams } from 'react-router-dom'

import { useDemoAccess } from '../hooks/useDemoAccess'

const cardCls =
  'flex flex-col items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 p-6 text-center transition hover:border-sky-500 hover:bg-slate-800/60'

const RolePicker = () => (
  <div className="w-full max-w-lg space-y-6">
    <div className="space-y-2 text-center">
      <h1 className="text-2xl font-bold text-white">Prueba Weldix sin registrarte</h1>
      <p className="text-sm text-slate-400">
        Entra a un taller de ejemplo y elige desde qué punto de vista quieres verlo.
      </p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Link to="/demo?rol=admin" className={cardCls}>
        <i className="bx bx-briefcase text-3xl text-amber-400" aria-hidden="true" />
        <span className="text-base font-bold text-white">Como jefe</span>
        <span className="text-xs text-slate-400">
          Stock, albarán con IA, RRHH y métricas del taller.
        </span>
      </Link>
      <Link to="/demo?rol=operario" className={cardCls}>
        <i className="bx bx-wrench text-3xl text-sky-400" aria-hidden="true" />
        <span className="text-base font-bold text-white">Como operario</span>
        <span className="text-xs text-slate-400">Registrar una OT y fichar la jornada.</span>
      </Link>
    </div>
    <div className="text-center">
      <a
        href="/"
        className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-300"
      >
        Volver al inicio
      </a>
    </div>
  </div>
)

const DemoError = ({ msg }) => (
  <div className="space-y-3 text-center">
    <p className="text-sm text-rose-400">{msg}</p>
    <a href="/demo" className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-400">
      Reintentar
    </a>
  </div>
)

const preparingState = (rol, error) =>
  rol &&
  !error && (
    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
      Preparando la demo…
    </p>
  )

// Solo pinta. La lógica de entrada vive en useDemoAccess.
const DemoEntryPage = () => {
  const [params] = useSearchParams()
  const rol = params.get('rol')
  const { error } = useDemoAccess(rol)

  const pickerState = !rol && <RolePicker />
  const errorState = error && <DemoError msg={error} />

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-300">
      {pickerState || errorState || preparingState(rol, error)}
    </main>
  )
}

export default DemoEntryPage
