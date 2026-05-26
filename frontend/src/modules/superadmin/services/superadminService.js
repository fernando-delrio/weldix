import { API_BASE_URL } from '../../core/lib/api'

const headers = (key) => ({ 'x-superadmin-key': key })

export const superadminService = {
  getMetrics: async (key) => {
    const res = await fetch(`${API_BASE_URL}/superadmin/metrics`, { headers: headers(key) })
    if (!res.ok) throw new Error(res.status === 401 ? 'Clave incorrecta' : 'Error del servidor')
    return res.json()
  },

  getWorkspaces: async (key) => {
    const res = await fetch(`${API_BASE_URL}/superadmin/workspaces`, { headers: headers(key) })
    if (!res.ok) throw new Error(res.status === 401 ? 'Clave incorrecta' : 'Error del servidor')
    return res.json()
  },
}
