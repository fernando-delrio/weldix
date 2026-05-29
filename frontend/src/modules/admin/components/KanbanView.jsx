import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

// ── Configuración de columnas ─────────────────────────────────────────────────
const COLUMNS = [
  { id: 'pendiente', label: 'Pendiente', color: '#f59e0b', dot: 'bg-amber-400' },
  { id: 'en_proceso', label: 'En proceso', color: '#38bdf8', dot: 'bg-sky-400' },
  { id: 'control', label: 'Control', color: '#a78bfa', dot: 'bg-violet-400' },
  { id: 'listo', label: 'Listo', color: '#34d399', dot: 'bg-emerald-400' },
  { id: 'entregado', label: 'Entregado', color: '#94a3b8', dot: 'bg-slate-400' },
]

// Etiquetas cortas para cuando las columnas son estrechas (ej: vista móvil)
const SHORT_LABEL = {
  pendiente: 'Pendiente',
  en_proceso: 'En proc.',
  control: 'Control',
  listo: 'Listo',
  entregado: 'Entregado',
}

// ── Tarjeta arrastrable ───────────────────────────────────────────────────────
const KanbanCard = ({ job, isDragging = false }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: job.id,
    data: { fromEstado: job.estado },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : 1,
    cursor: 'grab',
    borderColor: 'var(--card-border)',
    boxShadow: 'var(--card-shadow-sm)',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="rounded-xl border bg-[var(--card-bg)] p-3 touch-none select-none"
    >
      <p className="text-xs font-bold tracking-widest text-slate-500">{job.code}</p>
      <p className="mt-0.5 text-[0.8rem] font-semibold leading-tight text-slate-200 line-clamp-2">
        {job.titulo}
      </p>
      {job.cliente && <p className="mt-1 text-xs text-slate-500 truncate">{job.cliente}</p>}
      {job.operario_name && (
        <div className="mt-1.5 flex items-center gap-1">
          <i className="bx bx-user text-xs text-slate-600" />
          <span className="text-xs text-slate-400">{job.operario_name}</span>
        </div>
      )}
    </div>
  )
}

// ── Tarjeta fantasma en DragOverlay ──────────────────────────────────────────
const DragGhost = ({ job }) => (
  <div
    className="w-[200px] rotate-1 rounded-xl border bg-[var(--card-bg)] p-3 shadow-2xl"
    style={{ borderColor: 'var(--card-border)', cursor: 'grabbing' }}
  >
    <p className="text-xs font-bold tracking-widest text-slate-500">{job.code}</p>
    <p className="mt-0.5 text-[0.8rem] font-semibold leading-tight text-slate-200 line-clamp-2">
      {job.titulo}
    </p>
  </div>
)

// ── Columna droppable ─────────────────────────────────────────────────────────
const KanbanColumn = ({ col, jobs, activeId }) => {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* Cabecera */}
      <div className="flex items-center gap-1.5 overflow-hidden px-1">
        <span className={`h-2 w-2 shrink-0 rounded-full ${col.dot}`} />
        <span className="truncate text-xs font-bold uppercase tracking-normal text-slate-400">
          {SHORT_LABEL[col.id]}
        </span>
        <span
          className="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-xs font-extrabold"
          style={{ backgroundColor: `${col.color}20`, color: col.color }}
        >
          {jobs.length}
        </span>
      </div>

      {/* Zona de drop */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 rounded-xl p-2 transition-colors min-h-[80px]"
        style={{
          backgroundColor: isOver ? `${col.color}0f` : 'rgba(255,255,255,0.02)',
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: isOver ? `${col.color}50` : 'rgba(255,255,255,0.06)',
        }}
      >
        {jobs.map((job) => (
          <KanbanCard key={job.id} job={job} isDragging={activeId === job.id} />
        ))}
        {jobs.length === 0 && <p className="py-4 text-center text-xs text-slate-600">Vacío</p>}
      </div>
    </div>
  )
}

// ── Tablero principal ─────────────────────────────────────────────────────────
const KanbanView = ({ jobs, onMoveJob }) => {
  const [activeJob, setActiveJob] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const byEstado = COLUMNS.reduce((acc, col) => {
    acc[col.id] = jobs.filter((j) => j.estado === col.id)
    return acc
  }, {})

  const handleDragStart = ({ active }) => {
    setActiveJob(jobs.find((j) => j.id === active.id) ?? null)
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveJob(null)
    if (!over) return
    const fromEstado = active.data.current?.fromEstado
    const toEstado = over.id
    if (fromEstado === toEstado) return
    onMoveJob(active.id, toEstado)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-5 gap-3 pb-3">
        {COLUMNS.map((col) => (
          <KanbanColumn key={col.id} col={col} jobs={byEstado[col.id]} activeId={activeJob?.id} />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeJob ? <DragGhost job={activeJob} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

export default KanbanView
