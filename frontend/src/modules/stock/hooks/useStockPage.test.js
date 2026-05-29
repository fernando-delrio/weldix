import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../tests/mocks/server'
import { MOCK_MATERIALS } from '../../../tests/mocks/handlers/stock.handlers'
import { useStockPage } from './useStockPage'

// ── useStockPage ─────────────────────────────────────────────────────────────
//
// Regla CLAUDE.md: testea el hook, no el componente.
// El hook orquesta estado y llamadas — si el hook funciona, el componente pinta bien.

describe('useStockPage', () => {
  it('carga los materiales al montarse', async () => {
    const { result } = renderHook(() => useStockPage())

    // Al principio está cargando
    expect(result.current.isLoading).toBe(true)

    // Espera a que el fetch termine
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.materials).toHaveLength(2)
    expect(result.current.materials[0].name).toBe('Hilo MIG 0.8mm')
    expect(result.current.error).toBeNull()
  })

  it('expone el error cuando el servidor falla', async () => {
    // Sobreescribe el handler solo para este test
    server.use(
      http.get('http://localhost:8000/stock', () => {
        return HttpResponse.json({ detail: 'Error interno' }, { status: 500 })
      })
    )

    const { result } = renderHook(() => useStockPage())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Error al cargar el stock')
    expect(result.current.materials).toHaveLength(0)
  })

  it('muestra feedback al hacer restock de un material', async () => {
    const { result } = renderHook(() => useStockPage())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.handleRestock(1, 10)
    })

    expect(result.current.feedback).toBe('Stock actualizado.')
  })

  it('muestra feedback con el número correcto de entradas en bulk restock', async () => {
    const { result } = renderHook(() => useStockPage())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.handleBulkRestock([
        { id: 1, cantidad: 5 },
        { id: 2, cantidad: 10 },
      ])
    })

    expect(result.current.feedback).toBe('2 entradas registradas.')
  })

  it('muestra feedback al crear un material nuevo', async () => {
    const { result } = renderHook(() => useStockPage())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.handleCreate({
        name: 'Varilla TIG 2.4mm',
        category: 'soldadura',
        quantity: 0,
        minimum: 10,
        unit: 'kg',
      })
    })

    expect(result.current.feedback).toBe('Material creado.')
  })
})
