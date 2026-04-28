import { API_BASE_URL } from '../../core/lib/api'

const TOKEN_KEY = 'weldix_access_token'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
})

const jsonHeaders = () => ({
  ...authHeaders(),
  'Content-Type': 'application/json',
})

export const getStock = async () => {
  const res = await fetch(`${API_BASE_URL}/stock`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al cargar el stock')
  return res.json()
}

export const createMaterial = async (data) => {
  const res = await fetch(`${API_BASE_URL}/stock`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Error al crear el material')
  }
  return res.json()
}

export const updateMaterial = async (id, data) => {
  const res = await fetch(`${API_BASE_URL}/stock/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Error al actualizar el material')
  }
  return res.json()
}

export const deleteMaterial = async (id) => {
  const res = await fetch(`${API_BASE_URL}/stock/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al eliminar el material')
}

export const generarVariantes = async (data) => {
  const res = await fetch(`${API_BASE_URL}/stock/generar-variantes`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Error al generar variantes')
  }
  return res.json()
}
