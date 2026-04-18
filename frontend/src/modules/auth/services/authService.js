import { API_BASE_URL } from '../../core/lib/api'

const TOKEN_KEY = 'weldix_access_token'

const assertResponseOk = (res, data) => {
  if (!res.ok) throw new Error(data.detail || 'Error en la solicitud')
}

const request = async (path, body) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  assertResponseOk(res, data)
  return data
}

const authGet = async (path) => {
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  assertResponseOk(res, data)
  return data
}

export const authService = {
  login: ({ email, password }) => request('/auth/login', { email, password }),

  registerWorkspace: ({ nombre_taller, admin_email, admin_password, admin_name, aceptar_terminos }) =>
    request('/auth/register-workspace', {
      nombre_taller,
      admin_email,
      admin_password,
      admin_name,
      aceptar_terminos,
    }),

  getTrialStatus: () => authGet('/auth/me/trial-status'),
}
