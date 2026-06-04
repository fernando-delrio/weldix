import { useCallback, useEffect, useState } from 'react'
import hotkeys from 'hotkeys-js'

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
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }, [])

  // Debounce: buscar 300ms después de que el usuario deja de escribir
  useEffect(() => {
    if (isQueryTooShort(query)) {
      setResults([])
      return
    }

    setIsSearching(true)
    setError('')

    const timer = setTimeout(async () => {
      await executeSearch(query, setResults, setError)
      setIsSearching(false)
    }, 300)

    // Cleanup: cancela el timer si query cambia antes de los 300ms
    return () => clearTimeout(timer)
  }, [query])

  // Ctrl+K / Cmd+K — abre o cierra el modal de búsqueda
  useEffect(() => {
    hotkeys('ctrl+k, command+k', (e) => {
      e.preventDefault()
      isOpen ? close() : open()
    })
    hotkeys('esc', () => {
      if (isOpen) close()
    })
    return () => {
      hotkeys.unbind('ctrl+k, command+k')
      hotkeys.unbind('esc')
    }
  }, [isOpen, open, close])

  return { isOpen, open, close, query, setQuery, results, isSearching, error }
}
