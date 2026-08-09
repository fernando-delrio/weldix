import { http, HttpResponse } from 'msw'
import { API_BASE_URL } from '../../../modules/core/lib/api'

const BASE = API_BASE_URL

// Estado inicial inmutable — nunca se toca directamente, solo se clona.
const INITIAL_DASHBOARD_JOBS = [
  {
    id: 1,
    code: 'ORD-2026-001',
    titulo: 'Soldadura de bancada',
    cliente: 'Cliente Test',
    estado: 'control',
    tone: 'secondary',
    progreso: 65,
    operario_id: 2,
    operario_name: 'Operario Test',
    fecha_inicio: null,
    created_at: '2026-01-01T00:00:00',
    urgente: false,
    motivo_rechazo: null,
  },
]

// Copia mutable que leen/escriben los handlers durante un test.
// Los handlers necesitan mutarla (POST /rechazar cambia estado) para que el
// GET /admin/dashboard posterior (el refresh() del hook) vea el cambio —
// así es como se comporta el backend real. Pero esa mutación NO debe
// sobrevivir entre tests: cada archivo de test debe llamar a
// resetAdminMocks() en un beforeEach para partir siempre del mismo estado,
// sin importar el orden ni el resultado de tests anteriores.
export let MOCK_DASHBOARD_JOBS = INITIAL_DASHBOARD_JOBS.map((job) => ({ ...job }))

export const resetAdminMocks = () => {
  MOCK_DASHBOARD_JOBS = INITIAL_DASHBOARD_JOBS.map((job) => ({ ...job }))
}

export const adminHandlers = [
  // GET /admin/dashboard
  http.get(`${BASE}/admin/dashboard`, () => {
    return HttpResponse.json({
      metrics: {},
      jobs: MOCK_DASHBOARD_JOBS,
      users: [],
    })
  }),

  // POST /trabajos/:id/rechazar
  http.post(`${BASE}/trabajos/:id/rechazar`, async ({ params, request }) => {
    const body = await request.json()
    const job = MOCK_DASHBOARD_JOBS.find((j) => j.id === Number(params.id))
    if (!job) return HttpResponse.json({ detail: 'No encontrado' }, { status: 404 })
    // Muta el registro en memoria para que el siguiente GET /admin/dashboard
    // (disparado por el refresh() del hook tras rejectJob) refleje el rechazo.
    job.estado = 'pendiente'
    job.urgente = true
    job.motivo_rechazo = body.motivo
    return HttpResponse.json(job)
  }),
]
