// 🆕 Debounce: técnica que retrasa la ejecución de una función hasta que el usuario
// "para" de escribir. Evita N llamadas al servidor mientras el usuario teclea.
// Aquí lo implementamos con useEffect + setTimeout: cada vez que cambia `query`,
// el efecto agenda una búsqueda en 300ms. Si `query` cambia antes de que pasen
// los 300ms, el cleanup cancela el timer anterior y arranca uno nuevo.
import { useCallback, useEffect, useRef, useState } from 'react'

import { searchJobs } from '../../jobs/services/jobsService'
import { mapJobsModel } from '../../jobs/lib/jobsModel'

const MIN_QUERY_LENGTH = 2

const isQueryTooShort = (q) => q.trim().length < MIN_QUERY_LENGTH

const executeSearch = async (q, setResults, setError) => {
  try {
    const raw = await searchJobs(q)
    setResults(mapJobsModel(raw))
  } catch (err) {
    setError(err.message)
  }
}

export const useSearch = () => {
  const [isOpen, setIsOpen]     = useState(false)
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError]       = useState('')

  const open  = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => { setIsOpen(false); setQuery(''); setResults([]) }, [])

  // Debounce: buscar 300ms después de que el usuario deja de escribir
  useEffect(() => {
    if (isQueryTooShort(query)) { setResults([]); return }

    setIsSearching(true)
    setError('')

    const timer = setTimeout(async () => {
      await executeSearch(query, setResults, setError)
      setIsSearching(false)
    }, 300)

    // Cleanup: cancela el timer si query cambia antes de los 300ms
    return () => clearTimeout(timer)
  }, [query])

  // Ctrl+K abre el modal desde cualquier parte de la app
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        isOpen ? close() : open()
      }
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, open, close])

  return { isOpen, open, close, query, setQuery, results, isSearching, error }
}
