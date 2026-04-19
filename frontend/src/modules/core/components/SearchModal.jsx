import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { getStatusConfig } from '../lib/statusConfig'

// ── Subcomponentes ─────────────────────────────────────────────────────────────

const searchingState = ({ isSearching }) =>
  isSearching && (
    <p className="px-4 py-6 text-center text-xs text-slate-500">Buscando...</p>
  )

const emptyState = ({ query, results, isSearching }) =>
  !isSearching && query.trim().length >= 2 && results.length === 0 && (
    <p className="px-4 py-6 text-center text-xs text-slate-500">
      Sin resultados para "{query}"
    </p>
  )

const hintState = ({ query }) =>
  query.trim().length < 2 && (
    <p className="px-4 py-6 text-center text-xs text-slate-600">
      Escribe al menos 2 caracteres
    </p>
  )

const resultItem = (job, onSelect) => {
  const { bgClass, label } = getStatusConfig(job.statusKey)
  return (
    <button
      key={job.id}
      type="button"
      onClick={() => onSelect(job.id)}
      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-800/70"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-100">{job.title}</p>
        <p className="mt-0.5 truncate text-[0.68rem] text-slate-500">
          {job.code ?? `#${job.id}`} · {job.client}
        </p>
      </div>
      <span className={`shrink-0 rounded border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] ${bgClass}`}>
        {label}
      </span>
    </button>
  )
}

const resultsList = ({ results, isSearching }, onSelect) =>
  !isSearching && results.length > 0 && (
    <ul className="divide-y divide-slate-800/60">
      {results.map((job) => (
        <li key={job.id}>{resultItem(job, onSelect)}</li>
      ))}
    </ul>
  )

// ── Componente principal ───────────────────────────────────────────────────────
const SearchModal = ({ isOpen, close, query, setQuery, results, isSearching }) => {
  const navigate  = useNavigate()
  const inputRef  = useRef(null)

  // Foco automático al abrir
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOpen])

  if (!isOpen) return null

  const selectJob = (id) => { navigate(`/app/trabajos/${id}`); close() }

  const state = { query, results, isSearching }

  return (
    // Overlay — clic fuera cierra el modal
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      onClick={close}
    >
      {/* Fondo difuminado */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-sm border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 shrink-0 text-slate-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar trabajo, cliente u OT..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-600 outline-none"
          />
          <kbd className="rounded border border-slate-700 px-1.5 py-0.5 text-[0.6rem] text-slate-600">ESC</kbd>
        </div>

        {/* Resultados */}
        <div className="max-h-[380px] overflow-y-auto">
          {hintState(state)}
          {searchingState(state)}
          {emptyState(state)}
          {resultsList(state, selectJob)}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-4 py-2">
          <p className="text-[0.6rem] text-slate-600">Ctrl+K para abrir · Enter o clic para ir al trabajo</p>
        </div>
      </div>
    </div>
  )
}

export default SearchModal
