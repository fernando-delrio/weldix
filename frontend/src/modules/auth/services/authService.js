import { API_BASE_URL } from '../../core/lib/api'

// Lanza error con el mensaje del backend si la respuesta no es 2xx
const assertResponseOk = (res, data) => {
  if (!res.ok) throw new Error(data.detail || 'Error en la solicitud')
}

async function request(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  assertResponseOk(res, data)
  return data
}

// Punto unico de acceso a la API de autenticacion
export const authService = {
  login:  ({ email, password })            => request('/auth/login',  { email, password }),
  signup: ({ email, password, full_name }) => request('/auth/signup', { email, password, full_name }),
}
