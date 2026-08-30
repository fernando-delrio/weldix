import { http, HttpResponse } from 'msw'
import { API_BASE_URL } from '../../../modules/core/lib/api'

const BASE = API_BASE_URL

export const billingHandlers = [
  // POST /billing/checkout
  http.post(`${BASE}/billing/checkout`, () => {
    return HttpResponse.json({
      checkout_url: 'https://checkout.stripe.com/test',
      num_seats: 1,
      precio_total: 29,
    })
  }),

  // GET /billing/portal
  http.get(`${BASE}/billing/portal`, () => {
    return HttpResponse.json({ portal_url: 'https://billing.stripe.com/test' })
  }),
]
