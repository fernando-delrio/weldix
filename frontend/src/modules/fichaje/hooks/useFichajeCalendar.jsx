import { useCallback, useEffect, useState } from 'react'

import { getMisJornadas } from '../services/fichajeService'

// Agrupa los fichajes en un mapa { "YYYY-MM-DD": { horas, abierto } }.
// Usa fecha LOCAL para que el día cuadre con lo que ve el operario.
const buildDayMap = (fichajes) =>
  fichajes.reduce((acc, f) => {
    const d = new Date(f.inicio)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const prev = acc[key] ?? { horas: 0, abierto: false }
    return {
      ...acc,
      [key]: {
        horas: prev.horas + (f.fin !== null ? (f.horas ?? 0) : 0),
        abierto: prev.abierto || f.fin === null,
      },
    }
  }, {})

// Orquesta la carga de jornadas del operario.
// El try/catch vive aquí (en el hook), no en el componente: el service lanza,
// el hook lo convierte en estado de UI. El componente solo pinta.
export const useFichajeCalendar = () => {
  const [dayMap, setDayMap] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getMisJornadas()
      setDayMap(buildDayMap(data))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { dayMap, isLoading, error, refresh: load }
}
