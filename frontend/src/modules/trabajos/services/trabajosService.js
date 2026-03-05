import { mapTrabajosModel } from '../lib/trabajosModel'

const MOCK_DELAY_MS = 220

const MOCK_JOBS = [
  {
    id: 'ORD-2024-087',
    title: 'Estructura metalica nave industrial',
    client: 'Construcciones Lopez S.L.',
    type: 'Estructura Metalica',
    area: 'Soldadura estructural',
    due: 'Entrega hoy',
    status: 'En proceso',
    tone: 'info',
    progress: 65,
  },
  {
    id: 'ORD-2024-089',
    title: 'Escalera acero inoxidable',
    client: 'Reformas Garcia',
    type: 'Inox',
    area: 'Soldadura fina',
    due: 'Entrega: 21 Mar',
    status: 'Pendiente',
    tone: 'warning',
    progress: 0,
  },
  {
    id: 'ORD-2024-085',
    title: 'Deposito agua 5000L',
    client: 'Agro Hermanos Perez',
    type: 'Caldereria Industrial',
    area: 'Caldereria',
    due: 'Entrega: 20 Mar',
    status: 'Control',
    tone: 'secondary',
    progress: 90,
  },
  {
    id: 'ORD-2024-081',
    title: 'Barandilla terraza inox',
    client: 'Comunidad Residencial Norte',
    type: 'Inox',
    area: 'Soldadura fina',
    due: 'Entrega: 15 Mar',
    status: 'Completado',
    tone: 'success',
    progress: 100,
  },
  {
    id: 'ORD-2024-078',
    title: 'Tolva acero carbono 3T',
    client: 'Agro Hermanos Perez',
    type: 'Caldereria Industrial',
    area: 'Caldereria',
    due: 'Entrega: 10 Mar',
    status: 'Completado',
    tone: 'success',
    progress: 100,
  },
  {
    id: 'ORD-2024-091',
    title: 'Soporte maquinaria CNC',
    client: 'Talleres Mendez',
    type: 'Estructura Metalica',
    area: 'Soldadura estructural',
    due: 'Entrega: 28 Mar',
    status: 'Pendiente',
    tone: 'warning',
    progress: 0,
  },
]

export async function getTrabajos() {
  await new Promise((resolve) => window.setTimeout(resolve, MOCK_DELAY_MS))
  return mapTrabajosModel(MOCK_JOBS)
}
