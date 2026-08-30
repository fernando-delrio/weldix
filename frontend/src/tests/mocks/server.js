import { setupServer } from 'msw/node'
import { stockHandlers } from './handlers/stock.handlers'
import { adminHandlers } from './handlers/admin.handlers'
import { billingHandlers } from './handlers/billing.handlers'

// Aquí se registran todos los handlers. Añade los de cada módulo según los vayas testeando.
export const server = setupServer(...stockHandlers, ...adminHandlers, ...billingHandlers)
