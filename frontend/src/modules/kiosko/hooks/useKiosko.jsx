import { useCallback, useEffect, useRef, useState } from 'react'

import { ficharKiosko, getKioskInfo } from '../services/kioskoService'

const MAX_DIGITS = 4
const RESULT_TIMEOUT_MS = 6000

// Hook del kiosko: carga el taller, gestiona el número tecleado y ficha.
// try/catch vive aquí (regla del proyecto); el componente solo pinta.
const useKiosko = (token) => {
  const [info, setInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const resultTimer = useRef(null)

  useEffect(() => {
    getKioskInfo(token)
      .then(setInfo)
      .catch((err) => setLoadError(err.message))
      .finally(() => setIsLoading(false))
  }, [token])

  const clearFeedback = () => {
    setResult(null)
    setError(null)
  }

  const pressDigit = (digit) => {
    clearFeedback()
    setInput((value) => (value.length < MAX_DIGITS ? value + digit : value))
  }

  const backspace = () => {
    clearFeedback()
    setInput((value) => value.slice(0, -1))
  }

  const clearInput = () => {
    clearFeedback()
    setInput('')
  }

  const submit = useCallback(async () => {
    if (!input) return
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const data = await ficharKiosko(token, input)
      setResult(data)
      setInput('')
      clearTimeout(resultTimer.current)
      resultTimer.current = setTimeout(() => setResult(null), RESULT_TIMEOUT_MS)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }, [token, input])

  useEffect(() => () => clearTimeout(resultTimer.current), [])

  return {
    info,
    isLoading,
    loadError,
    input,
    submitting,
    result,
    error,
    pressDigit,
    backspace,
    clearInput,
    submit,
  }
}

export default useKiosko
