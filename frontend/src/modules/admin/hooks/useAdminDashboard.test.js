import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../tests/mocks/server'
import { API_BASE_URL } from '../../core/lib/api'
import { useAdminDashboard } from './useAdminDashboard'
import { resetAdminMocks } from '../../../tests/mocks/handlers/admin.handlers'

// Regla CLAUDE.md: testea el hook, no el componente.

describe('useAdminDashboard', () => {
  // MOCK_DASHBOARD_JOBS se muta dentro del handler POST /rechazar (simula
  // persistencia real). Sin este reset, un segundo test que dependiera del
  // estado inicial ('control') heredaría la mutación de un test anterior
  // según el orden de ejecución — flaky por diseño. Se resetea siempre antes
  // de cada test para que ninguno dependa de lo que hizo otro.
  beforeEach(() => {
    resetAdminMocks()
  })

  it('rechaza un trabajo y refresca el dashboard', async () => {
    const { result } = renderHook(() => useAdminDashboard())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.dashboard.jobs[0].estado).toBe('control')

    await act(async () => {
      await result.current.rejectJob(1, 'Falta pulir la soldadura')
    })

    expect(result.current.dashboard.jobs[0].estado).toBe('pendiente')
    expect(result.current.dashboard.jobs[0].urgente).toBe(true)
    expect(result.current.dashboard.jobs[0].motivo_rechazo).toBe('Falta pulir la soldadura')
  })

  // Bug real: un operario que entra a /app/admin veía "No se pudo cargar" +
  // un botón "Reintentar" que nunca iba a funcionar — un 403 no es un fallo
  // de red, reintentar no cambia nada. El hook debe distinguir el 403.
  it('expone isForbidden cuando el backend responde 403', async () => {
    server.use(
      http.get(`${API_BASE_URL}/admin/dashboard`, () => {
        return HttpResponse.json({ detail: 'No autorizado' }, { status: 403 })
      })
    )

    const { result } = renderHook(() => useAdminDashboard())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isForbidden).toBe(true)
    expect(result.current.error).toBe('No tienes permiso para ver el panel de administración.')
  })
})
