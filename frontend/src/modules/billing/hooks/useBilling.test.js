import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../tests/mocks/server'
import { API_BASE_URL } from '../../core/lib/api'
import { useBilling } from './useBilling'

// ── useBilling ───────────────────────────────────────────────────────────────
//
// Regla CLAUDE.md: testea el hook, no el componente.
//
// Bug real: BillingStatusCard destructuraba useBilling() sin `error`, así que
// un fallo de Stripe (ej. 503 con la pasarela sin configurar) quedaba mudo —
// el botón dejaba de girar y no pasaba nada. El hook ya guardaba el error
// correctamente; lo que faltaba era pintarlo. Este test fija que el hook
// sigue exponiendo `error` cuando el checkout falla.

describe('useBilling', () => {
  it('expone error cuando el checkout de Stripe falla', async () => {
    server.use(
      http.post(`${API_BASE_URL}/billing/checkout`, () => {
        return HttpResponse.json(
          { detail: 'Los pagos aún no están configurados (503)' },
          { status: 503 }
        )
      })
    )

    const { result } = renderHook(() => useBilling())

    await act(async () => {
      await result.current.startCheckout()
    })

    await waitFor(() => {
      expect(result.current.error).toBe('Los pagos aún no están configurados (503)')
    })
    expect(result.current.isRedirecting).toBe(false)
  })

  it('no deja error cuando el checkout funciona', async () => {
    const { result } = renderHook(() => useBilling())

    await act(async () => {
      await result.current.startCheckout()
    })

    expect(result.current.error).toBeNull()
  })
})
