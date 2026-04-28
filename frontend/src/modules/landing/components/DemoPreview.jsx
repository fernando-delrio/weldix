import { useState, useEffect } from 'react'
import { cx } from '../../core/lib/cx'

const S = {
  text:       'text-zinc-300',
  textStrong: 'text-zinc-100',
  textMuted:  'text-zinc-500',
  accent:     'text-yellow-400',
  green:      'text-teal-400',
  blue:       'text-sky-400',
  red:        'text-red-400',
  border:     'border-zinc-800',
  cardBg:     'bg-zinc-900/60',
}

const SCENES = [
  { id: 'ot',    label: 'Crear OT', icon: 'bx bx-list-check', steps: 5, ms: 6200 },
  { id: 'est',   label: 'Estado',   icon: 'bx bx-time-five',  steps: 4, ms: 5500 },
  { id: 'fich',  label: 'Fichaje',  icon: 'bx bx-door-open',  steps: 3, ms: 5000 },
  { id: 'stock', label: 'Stock',    icon: 'bx bx-package',    steps: 4, ms: 5500 },
  { id: 'ia',    label: 'IA',       icon: 'bx bx-bot',        steps: 4, ms: 6500 },
  { id: 'rrhh',  label: 'Vacac.',   icon: 'bx bx-calendar',   steps: 4, ms: 5200 },
]

// Aparición instantánea — sin transition para no crear parpadeo de opacidad intermedia
const vis = (step, n) => step >= n ? 'opacity-100' : 'opacity-0'

// border-b en la fila misma → el separador desaparece cuando la fila es invisible
const Row = ({ label, value, show = true, green = false }) => (
  <div className={cx('flex items-center gap-3 border-b border-zinc-800/80 px-4 py-2.5', show ? 'opacity-100' : 'opacity-0')}>
    <span className={cx('w-16 shrink-0 text-[0.58rem] uppercase tracking-wider', S.textMuted)}>{label}</span>
    <span className={cx('text-[0.75rem]', green ? S.green : S.text)}>{value}</span>
  </div>
)

const Cmd = ({ cmd, step }) => (
  <div className={cx('flex items-center gap-2 pt-2', vis(step, 0))}>
    <span className={cx('text-sm', S.accent)}>$</span>
    <span className={cx('text-[0.78rem]', S.text)}>{cmd}</span>
  </div>
)

// Crossfade suave solo para el toggle botón→éxito dentro de una misma escena
const Swap = ({ showA, a, b, className = 'h-[72px]' }) => (
  <div className={cx('relative', className)}>
    <div className={cx('absolute top-0 left-0 w-full transition-opacity duration-300', showA ? 'opacity-100' : 'opacity-0 pointer-events-none')}>{a}</div>
    <div className={cx('absolute top-0 left-0 w-full transition-opacity duration-300', showA ? 'opacity-0 pointer-events-none' : 'opacity-100')}>{b}</div>
  </div>
)

// ─── escenas ──────────────────────────────────────────────────────────────────

const SceneCrearOT = ({ step }) => (
  <div className="space-y-4 px-6 pb-4 pt-2">
    <Cmd cmd="nueva-ot --tipo inox" step={step} />
    <div className={cx('overflow-hidden rounded-sm border', S.border, S.cardBg, vis(step, 1))}>
      <Row label="Título"   value="Soldadura estructura acero inox" />
      <Row label="Tipo"     value="Inox · Calderería"               show={step >= 2} />
      <Row label="Cliente"  value="Metalúrgica García S.L."         show={step >= 3} />
      <Row label="Operario" value="Javier Morales"                  show={step >= 3} green />
    </div>
    <Swap
      showA={step < 5}
      className={cx('relative h-[72px]', vis(step, 3))}
      a={
        <button className="flex items-center gap-2 rounded-sm bg-yellow-500 px-5 py-2.5 text-[0.68rem] font-black uppercase tracking-wider text-black">
          <i className="bx bx-plus" /> Crear OT
        </button>
      }
      b={
        <div className="space-y-1.5">
          <div className={cx('flex items-center gap-2 rounded-sm border border-teal-500/40 bg-teal-500/10 px-5 py-2.5 text-[0.68rem] font-black uppercase tracking-wider', S.green)}>
            <i className="bx bx-check-circle" /> ORD-2026-047 — creada correctamente
          </div>
          <p className={cx('pl-1 text-[0.6rem]', S.textMuted)}>Estado: Pendiente · asignada a Javier Morales</p>
        </div>
      }
    />
  </div>
)

const SceneVerEstado = ({ step }) => {
  const progress = step >= 3 ? 65 : step >= 2 ? 20 : 0
  return (
    <div className="space-y-4 px-6 pb-4 pt-2">
      <div className={cx('flex items-center justify-between', vis(step, 0))}>
        <div>
          <p className={cx('text-[0.6rem] font-bold uppercase tracking-wider', S.textMuted)}>Orden activa</p>
          <p className={cx('text-[0.9rem] font-black', S.textStrong)}>ORD-2026-047</p>
        </div>
        <span className={cx('rounded-sm border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-wider', S.blue)}>EN PROCESO</span>
      </div>
      <div className={cx('space-y-1', vis(step, 1))}>
        <p className={cx('text-[0.8rem] font-bold', S.textStrong)}>Soldadura estructura acero inox</p>
        <p className={cx('text-[0.68rem]', S.textMuted)}>Metalúrgica García S.L. · Javier Morales</p>
      </div>
      <div className={cx('space-y-3', vis(step, 2))}>
        <div className="flex items-center gap-3">
          {[{ label: 'Preparación', done: true }, { label: 'Soldadura', active: true }, { label: 'Control', pending: true }].map(({ label, done, active }) => (
            <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
              <div className={cx('flex h-6 w-6 items-center justify-center rounded-full text-[0.6rem] font-black', done ? 'bg-teal-500 text-white' : active ? 'bg-yellow-500 text-black' : cx('border', S.border, S.textMuted))}>
                {done ? '✓' : active ? '●' : '○'}
              </div>
              <span className={cx('text-[0.55rem] uppercase tracking-wider', done ? 'text-teal-500' : active ? 'text-yellow-400' : S.textMuted)}>{label}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[0.6rem]">
            <span className={cx('uppercase tracking-wider', S.textMuted)}>Progreso</span>
            <span className={cx('font-bold', S.accent)}>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-yellow-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <div className={cx('flex items-center justify-between', vis(step, 3))}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-teal-400" />
          <span className={cx('text-[0.62rem]', S.textMuted)}>04:37 activo · hoy 08:14</span>
        </div>
        <button className={cx('rounded-sm border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider', S.accent)}>
          Pasar a control →
        </button>
      </div>
    </div>
  )
}

const SceneFichaje = ({ step }) => (
  <div className="space-y-4 px-6 pb-4 pt-2">
    <Cmd cmd="fichar --entrada" step={step} />
    <div className={cx('rounded-sm border p-4 space-y-3', S.border, S.cardBg, vis(step, 1))}>
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-teal-500/30 bg-teal-500/10">
          <i className={cx('bx bx-door-open text-xl', S.green)} />
        </div>
        <div>
          <p className={cx('text-[0.82rem] font-black', S.green)}>08:14 · Entrada registrada</p>
          <p className={cx('text-[0.65rem]', S.textMuted)}>28 de abril de 2026 · Turno mañana</p>
        </div>
      </div>
      <div className={cx('space-y-2 border-t pt-3', S.border, step >= 2 ? 'opacity-100' : 'opacity-0')}>
        <div className="flex items-center gap-2">
          <i className={cx('bx bx-shield-check', S.green)} />
          <span className={cx('text-[0.65rem]', S.textMuted)}>RDL 8/2019 cumplido · registro geolocalizado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-teal-400" />
          <span className={cx('text-[0.65rem]', S.textMuted)}>Jornada activa</span>
          <span className={cx('ml-auto text-[0.65rem] font-black', S.accent)}>00:00:12 ▶</span>
        </div>
      </div>
    </div>
    <div className={vis(step, 3)}>
      <button className="flex items-center gap-2 rounded-sm border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-[0.68rem] font-black uppercase tracking-wider text-red-400">
        <i className="bx bx-log-out-circle" /> Fichar salida al terminar
      </button>
    </div>
  </div>
)

const SceneStock = ({ step }) => (
  <div className="space-y-4 px-6 pb-4 pt-2">
    <Cmd cmd="stock --consumir ORD-2026-047" step={step} />
    <div className={cx('overflow-hidden rounded-sm border', S.border, S.cardBg, vis(step, 1))}>
      <Row label="Material" value="Varilla inox AWS E308L 2.4mm" />
      <Row label="Consumo"  value="-3.5 kg · registrado en OT-047" show={step >= 2} />
      <Row label="Restante" value="6.5 kg  (era 10.0 kg)"          show={step >= 2} green={step < 3} />
    </div>
    <Swap
      showA={step < 3}
      className={cx('relative h-[72px]', vis(step, 2))}
      a={
        <div className={cx('flex items-center gap-2 rounded-sm border border-teal-500/30 bg-teal-500/10 px-5 py-2.5 text-[0.68rem] font-black uppercase tracking-wider', S.green)}>
          <i className="bx bx-check-circle" /> Consumo registrado correctamente
        </div>
      }
      b={
        <div className="space-y-2">
          <div className={cx('flex items-center gap-2 rounded-sm border border-yellow-500/30 bg-yellow-500/10 px-5 py-2.5 text-[0.68rem] font-black uppercase tracking-wider', S.accent)}>
            <i className="bx bx-error" /> Stock bajo mínimo configurado (10 kg)
          </div>
          <div className={cx('flex items-center gap-1.5 text-[0.62rem]', S.textMuted)}>
            <i className={cx('bx bx-bell text-sm', S.accent)} /> Notificación enviada al admin vía n8n
          </div>
        </div>
      }
    />
  </div>
)

const SceneIA = ({ step }) => (
  <div className="space-y-4 px-6 pb-4 pt-2">
    <Cmd cmd="ia --consultar" step={step} />
    <div className={cx('flex items-start gap-3', vis(step, 1))}>
      <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.5rem]', S.border, S.textMuted)}>TÚ</span>
      <div className={cx('rounded-sm rounded-tl-none border px-4 py-2.5', S.border, 'bg-zinc-800/60')}>
        <p className={cx('text-[0.75rem]', S.text)}>¿Qué varilla uso para soldadura inox?</p>
      </div>
    </div>
    {/* Siempre en DOM, sin h-0 — reserva espacio fijo, solo cambia opacidad */}
    <p className={cx('text-[0.65rem] pointer-events-none', S.accent, step === 2 ? 'opacity-100' : 'opacity-0')}>
      ⚙ Weldix AI analizando tu taller...
    </p>
    <div className={cx('flex items-start gap-3', vis(step, 3))}>
      <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-yellow-500/40 bg-yellow-500/10 text-[0.5rem]', S.accent)}>IA</span>
      <div className="space-y-1.5 rounded-sm rounded-tl-none border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
        <p className={cx('text-[0.75rem] font-semibold', S.textStrong)}>AWS E308L-16, Ø2.4mm para inox 304/316.</p>
        <p className={cx('text-[0.65rem]', S.textMuted)}>Tu stock: 6.5 kg disponibles · suficiente para esta OT</p>
        <p className={cx('text-[0.6rem]', S.textMuted)}>Basado en los datos reales de tu taller</p>
      </div>
    </div>
  </div>
)

const SceneVacaciones = ({ step }) => (
  <div className="space-y-4 px-6 pb-4 pt-2">
    <Cmd cmd="rrhh --solicitar vacaciones" step={step} />
    <div className={cx('overflow-hidden rounded-sm border', S.border, S.cardBg, vis(step, 1))}>
      <Row label="Tipo" value="Vacaciones" />
      <Row label="Del"  value="01/08/2026" show={step >= 2} />
      <Row label="Al"   value="14/08/2026" show={step >= 2} />
      <div className={cx('flex items-center gap-3 border-b border-zinc-800/80 px-4 py-2.5', step >= 2 ? 'opacity-100' : 'opacity-0')}>
        <span className="w-16 shrink-0" />
        <span className={cx('text-[0.68rem]', S.green)}>10 días laborables · saldo disponible: 22 días</span>
      </div>
    </div>
    <Swap
      showA={step < 4}
      className={cx('relative h-[72px]', vis(step, 3))}
      a={
        <button className="flex items-center gap-2 rounded-sm bg-yellow-500 px-5 py-2.5 text-[0.68rem] font-black uppercase tracking-wider text-black">
          <i className="bx bx-send" /> Enviar solicitud (10d)
        </button>
      }
      b={
        <div className="space-y-1.5">
          <div className={cx('flex items-center gap-2 rounded-sm border border-teal-500/40 bg-teal-500/10 px-5 py-2.5 text-[0.68rem] font-black uppercase tracking-wider', S.green)}>
            <i className="bx bx-check-circle" /> Solicitud enviada — pendiente de aprobación
          </div>
          <p className={cx('pl-1 text-[0.6rem]', S.textMuted)}>El admin recibirá notificación en breve</p>
        </div>
      }
    />
  </div>
)

// ─── componente principal ─────────────────────────────────────────────────────

const SCENE_COMPONENTS = [
  SceneCrearOT, SceneVerEstado, SceneFichaje, SceneStock, SceneIA, SceneVacaciones,
]

const DemoPreview = ({ t, isDark }) => {
  const [sceneIdx, setSceneIdx] = useState(0)
  const [step, setStep]         = useState(0)

  const scene = SCENES[sceneIdx]

  useEffect(() => {
    if (step >= scene.steps) return
    const id = setTimeout(() => setStep((s) => s + 1), 900)
    return () => clearTimeout(id)
  }, [step, scene.steps])

  useEffect(() => {
    const id = setTimeout(() => {
      setSceneIdx((s) => (s + 1) % SCENES.length)
      setStep(0)
    }, scene.ms)
    return () => clearTimeout(id)
  }, [sceneIdx, scene.ms])

  const goTo = (idx) => { setSceneIdx(idx); setStep(0) }

  return (
    <div className={cx(
      'relative overflow-hidden rounded-sm font-mono',
      isDark
        ? 'border border-zinc-800 shadow-2xl shadow-black/60 bg-[#070b0f]'
        : 'bg-[#070b0f] shadow-2xl shadow-zinc-900/25 ring-1 ring-offset-2 ring-stone-300/60 ring-offset-[#f5f0e8]',
    )}>
      {/* Esquinas decorativas */}
      <div className={cx('absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 pointer-events-none', t.accentBorder)} />
      <div className={cx('absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 pointer-events-none', t.accentBorder)} />

      {/* Cabecera */}
      <div className={cx('flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-5 py-3', S.border)}>
        <span className="h-2 w-2 rounded-full bg-teal-400" />
        <span className={cx('text-[0.58rem] uppercase tracking-widest', S.textMuted)}>weldix · demo en vivo</span>
        <div className="ml-auto flex flex-wrap gap-1">
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              className={cx(
                'flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-[0.55rem] font-bold uppercase tracking-wider transition-colors duration-200',
                i === sceneIdx
                  ? cx('border border-yellow-500/30 bg-yellow-500/15', S.accent)
                  : cx(S.textMuted, 'hover:text-zinc-400'),
              )}
            >
              <i className={cx(s.icon, 'text-xs')} />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Todas las escenas en el DOM simultáneamente — crossfade solo con opacidad del padre.
          Sin desmonte/monte no hay flash ni salto al cambiar escena. */}
      <div className="relative h-[280px] overflow-hidden bg-[#070b0f]">
        {SCENE_COMPONENTS.map((Scene, i) => (
          <div
            key={i}
            className={cx(
              'absolute inset-0 overflow-hidden transition-opacity duration-500',
              i === sceneIdx ? 'opacity-100' : 'opacity-0 pointer-events-none',
            )}
          >
            {/* Escena activa recibe step real. Inactivas reciben step máximo para
                que su fade-out muestre el estado final (no el estado vacío inicial). */}
            <Scene step={i === sceneIdx ? step : SCENES[i].steps} />
          </div>
        ))}
      </div>

      {/* Barra de progreso */}
      <div className={cx('flex gap-1.5 border-t px-5 py-3', S.border)}>
        {SCENES.map((s, i) => (
          <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-yellow-500"
              style={{
                width: i === sceneIdx ? `${Math.min(100, (step / scene.steps) * 100)}%` : '0%',
                transition: i === sceneIdx ? 'width 900ms linear' : 'none',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default DemoPreview
