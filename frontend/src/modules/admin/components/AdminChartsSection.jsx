import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

import PanelCard from '../../core/components/PanelCard'
import { buildEstadoData, buildCargaOperarioData, buildPorMesData } from '../lib/adminCharts'

// ── Estilos compartidos para tooltips ────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 10,
  color: 'var(--app-text)',
  fontSize: 12,
}

const axisStyle = { fill: '#64748b', fontSize: 11 }
const gridStyle = { stroke: 'rgba(148, 163, 184, 0.2)' }

const chartLabel = (title) => (
  <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{title}</p>
)

// ── Donut: trabajos por estado ────────────────────────────────────────────────
const DonutEstado = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <PanelCard>
      {chartLabel('Trabajos por estado')}
      <div className="relative flex items-center gap-6">
        <div className="relative" style={{ width: 140, height: 140 }}>
          <PieChart width={140} height={140}>
            <Pie
              data={data}
              cx={65}
              cy={65}
              innerRadius={44}
              outerRadius={65}
              dataKey="value"
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v, name) => [`${v} OTs`, name]}
              cursor={false}
            />
          </PieChart>
          {/* Total centrado */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold text-slate-100">{total}</span>
            <span className="text-xs uppercase tracking-widest text-slate-500">total</span>
          </div>
        </div>

        {/* Leyenda */}
        <ul className="space-y-1.5">
          {data.map((d) => (
            <li key={d.name} className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="text-xs text-slate-300">
                {d.name} <span className="font-semibold text-slate-100">{d.value}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </PanelCard>
  )
}

// ── Barras horizontales: carga activa por operario ────────────────────────────
const BarCargaOperario = ({ data }) => (
  <PanelCard>
    {chartLabel('Carga activa por operario')}
    {data.length === 0 ? (
      <p className="text-xs text-slate-500">Sin trabajos activos actualmente.</p>
    ) : (
      <ResponsiveContainer width="100%" height={data.length * 36 + 16}>
        <BarChart layout="vertical" data={data} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" {...gridStyle} />
          <XAxis
            type="number"
            tick={axisStyle}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={axisStyle}
            width={72}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => [`${v} trabajos activos`]}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar dataKey="value" fill="#38bdf8" radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    )}
  </PanelCard>
)

// ── Barras: OTs creadas por mes ───────────────────────────────────────────────
const BarPorMes = ({ data }) => (
  <PanelCard>
    {chartLabel('OTs creadas — últimos 6 meses')}
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" {...gridStyle} />
        <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} allowDecimals={false} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [`${v} OTs`]}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        />
        <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  </PanelCard>
)

// ── Sección principal ─────────────────────────────────────────────────────────
const AdminChartsSection = ({ dashboard }) => {
  const estadoData = buildEstadoData(dashboard.metrics)
  const cargaData = buildCargaOperarioData(dashboard.users)
  const mesData = buildPorMesData(dashboard.jobs)

  return (
    <section className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Análisis</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DonutEstado data={estadoData} />
        <BarCargaOperario data={cargaData} />
      </div>
      <BarPorMes data={mesData} />
    </section>
  )
}

export default AdminChartsSection
