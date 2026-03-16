import { API_BASE_URL } from '../../core/lib/api'

const TOKEN_KEY = 'weldix_access_token'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
  'Content-Type': 'application/json',
})

export const updateProfile = async (full_name) => {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ full_name }),
  })
  if (!res.ok) throw new Error('Error al actualizar el perfil')
  return res.json()
}

export const changePassword = async (current_password, new_password) => {
  const res = await fetch(`${API_BASE_URL}/auth/me/password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ current_password, new_password }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.detail || 'Error al cambiar la contraseña')
  }
}
