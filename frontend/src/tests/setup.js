import '@testing-library/jest-dom'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './mocks/server'

// Arranca el servidor de MSW antes de todos los tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

// Limpia los handlers personalizados entre tests
afterEach(() => server.resetHandlers())

// Para el servidor al terminar
afterAll(() => server.close())
