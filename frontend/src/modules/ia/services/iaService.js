import { API_BASE_URL } from '../../core/lib/api'

const TOKEN_KEY = 'weldix_access_token'

const jsonHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
  'Content-Type': 'application/json',
})

// contextoSeccion: string con resumen de la sección activa (stock bajo, trabajo activo, saldo RRHH, etc.)
export const consultarIA = async (mensaje, historial = [], contextoSeccion = null) => {
  const res = await fetch(`${API_BASE_URL}/ia/consulta`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({
      mensaje,
      historial,
      contexto_seccion: contextoSeccion,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Error al contactar con la IA')
  }
  const data = await res.json()
  return data.respuesta
}
