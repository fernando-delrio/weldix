import { API_BASE_URL } from '../../core/lib/api'

const TOKEN_KEY = 'weldix_access_token'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
})

export const getFotosParaTrabajo = async (jobId) => {
  const res = await fetch(`${API_BASE_URL}/trabajos/${jobId}/fotos`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al obtener fotos del trabajo')
  return res.json()
}

export const uploadFoto = async (jobId, file, etiqueta = 'durante') => {
  // FormData: el backend espera multipart/form-data — no añadimos Content-Type manualmente
  // porque el navegador lo pone con el boundary correcto
  const form = new FormData()
  form.append('file', file)
  form.append('etiqueta', etiqueta)

  const res = await fetch(`${API_BASE_URL}/trabajos/${jobId}/fotos`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al subir la foto')
  }
  return res.json()
}

export const deleteFoto = async (fotoId) => {
  const res = await fetch(`${API_BASE_URL}/fotos/${fotoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Error al eliminar la foto')
  }
}
