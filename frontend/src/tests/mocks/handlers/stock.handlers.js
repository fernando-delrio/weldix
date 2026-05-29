import { http, HttpResponse } from 'msw'
import { API_BASE_URL } from '../../../modules/core/lib/api'

const BASE = API_BASE_URL

// Datos de prueba que simulan lo que devuelve el backend real
export const MOCK_MATERIALS = [
  {
    id: 1,
    name: 'Hilo MIG 0.8mm',
    display_name: 'Hilo MIG 0.8mm',
    category: 'soldadura',
    quantity: 3,
    minimum: 5,
    unit: 'kg',
    specs: {},
    supplier_code: null,
    created_at: '2026-01-01T00:00:00',
    level: 60,
    tone: 'warning',
    stock_label: 'Stock: 3 kg',
    minimum_label: 'Minimo: 5 kg',
  },
  {
    id: 2,
    name: 'Disco corte 230mm',
    display_name: 'Disco corte 230mm',
    category: 'consumible',
    quantity: 25,
    minimum: 20,
    unit: 'ud',
    specs: {},
    supplier_code: null,
    created_at: '2026-01-01T00:00:00',
    level: 100,
    tone: 'success',
    stock_label: 'Stock: 25 ud',
    minimum_label: 'Minimo: 20 ud',
  },
]

export const stockHandlers = [
  // GET /stock — devuelve la lista de materiales
  http.get(`${BASE}/stock`, () => {
    return HttpResponse.json(MOCK_MATERIALS)
  }),

  // POST /stock/:id/restock — simula añadir stock a un material
  http.post(`${BASE}/stock/:id/restock`, async ({ params, request }) => {
    const body = await request.json()
    const material = MOCK_MATERIALS.find((m) => m.id === Number(params.id))
    if (!material) return HttpResponse.json({ detail: 'No encontrado' }, { status: 404 })
    return HttpResponse.json({ ...material, quantity: material.quantity + body.cantidad })
  }),

  // POST /stock — crear material
  http.post(`${BASE}/stock`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { id: 99, ...body, level: 0, tone: 'danger', created_at: '2026-01-01T00:00:00' },
      { status: 201 }
    )
  }),
]
