import { useEffect } from 'react'
import hotkeys from 'hotkeys-js'

/**
 * Shortcuts globales de la app.
 * Se registran una vez en AppShell y se limpian al desmontar.
 *
 * Shortcuts activos:
 *   ctrl+k / cmd+k → abre la búsqueda global
 *   ctrl+b / cmd+b → colapsa/expande el sidebar (futuro)
 *   ?             → muestra la ayuda de atajos (futuro)
 */
const useAppHotkeys = ({ onSearch }) => {
  useEffect(() => {
    hotkeys('ctrl+k, command+k', (e) => {
      e.preventDefault()
      onSearch?.()
    })

    return () => {
      hotkeys.unbind('ctrl+k, command+k')
    }
  }, [onSearch])
}

export default useAppHotkeys
