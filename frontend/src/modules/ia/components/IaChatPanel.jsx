import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const MotionDiv = motion.div

import { cx } from '../../core/lib/cx'
import { useIaContext } from '../lib/IaContext'
import { useIaChat } from '../hooks/useIaChat'
import { renderFormattedText } from '../lib/formatMessage'
import WeldixButton from '../../core/components/WeldixButton'

const SPRING = { type: 'spring', damping: 26, stiffness: 140 }

const UserBubble = ({ content }) => (
  <div className="flex justify-end">
    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-sky-600/30 px-3.5 py-2.5 text-sm text-slate-100">
      {content}
    </div>
  </div>
)

const AssistantBubble = ({ content }) => (
  <div className="flex justify-start">
    <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-slate-700/60 bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-200 whitespace-pre-wrap">
      {renderFormattedText(content)}
    </div>
  </div>
)

const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-slate-700/60 bg-slate-800/60 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  </div>
)

const sectionBanner = ({ pageContext }) =>
  pageContext?.seccion && (
    <div className="mx-4 mt-3 rounded-lg border border-sky-700/40 bg-sky-500/10 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-widest text-sky-400">
        Contexto · {pageContext.seccion}
      </p>
      {pageContext.resumen && (
        <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">{pageContext.resumen}</p>
      )}
    </div>
  )

const SugerenciasChips = ({ sugerencias, onSelect, visible }) =>
  visible &&
  sugerencias?.length > 0 && (
    <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2">
      {sugerencias.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-500/60 hover:bg-sky-500/10 hover:text-sky-300"
        >
          {s}
        </button>
      ))}
    </div>
  )

const emptyState = ({ messages, pageContext }) =>
  messages.length === 0 && (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl border border-sky-700/40 bg-sky-500/10 text-2xl">
        🔧
      </div>
      <p className="text-sm font-semibold text-slate-300">Asistente técnico Weldix</p>
      <p className="text-xs text-slate-500 leading-relaxed">
        {pageContext?.seccion
          ? `Estás en ${pageContext.seccion}. Pregúntame lo que necesites.`
          : 'Pregúntame sobre técnicas de soldadura, materiales, normas o cualquier duda del taller.'}
      </p>
    </div>
  )

const IaChatPanel = () => {
  const { pageContext, closeChat } = useIaContext()
  const { messages, isLoading, error, sendMessage, clearChat } = useIaChat(pageContext)
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = (texto) => {
    sendMessage(texto)
    setInput('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    handleSend(input)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  return (
    <>
      {/* Backdrop — fade independiente para ver la app detrás */}
      <MotionDiv
        key="ia-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 bg-slate-950/35 backdrop-blur-[3px]"
        style={{ zIndex: 48 }}
        onClick={closeChat}
        aria-hidden="true"
      />

      {/* Wrapper de centrado — no animado, solo posiciona el panel */}
      <div
        className="fixed inset-0 pointer-events-none flex items-center justify-center p-4"
        style={{ zIndex: 50 }}
      >
        {/* Panel — comparte layoutId con el FAB para el efecto morph */}
        <MotionDiv
          layoutId="ia-panel"
          className="pointer-events-auto flex flex-col rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden"
          style={{
            width: 'min(480px, calc(100vw - 2rem))',
            height: 'min(600px, 85dvh)',
          }}
          transition={SPRING}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-700/60 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/20 text-sm">
                🔧
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">Weldix AI</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest">
                  {pageContext?.seccion ? pageContext.seccion : 'Asistente de taller'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <WeldixButton
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  aria-label="Limpiar historial del chat"
                >
                  Limpiar
                </WeldixButton>
              )}
              <WeldixButton
                variant="ghost"
                size="icon"
                onClick={closeChat}
                aria-label="Cerrar chat"
                className="h-11 w-11 border border-slate-700"
              >
                ✕
              </WeldixButton>
            </div>
          </div>

          {sectionBanner({ pageContext })}

          <SugerenciasChips
            sugerencias={pageContext?.sugerencias}
            onSelect={handleSend}
            visible={messages.length === 0}
          />

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {emptyState({ messages, pageContext })}
            {messages.map((msg, i) =>
              msg.role === 'user' ? (
                <UserBubble key={i} content={msg.content} />
              ) : (
                <AssistantBubble key={i} content={msg.content} />
              )
            )}
            {isLoading && <TypingIndicator />}
            {error && <p className="text-center text-xs text-rose-400">{error}</p>}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="shrink-0 border-t border-slate-700/60 p-3">
            <div className="flex items-end gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 focus-within:border-sky-500/60">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu consulta..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                style={{ maxHeight: '96px' }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                aria-label="Enviar mensaje"
                className={cx(
                  'shrink-0 grid h-11 w-11 place-items-center rounded-lg transition',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400',
                  'disabled:pointer-events-none disabled:opacity-50',
                  input.trim() && !isLoading
                    ? 'bg-sky-500 text-white hover:bg-sky-400'
                    : 'bg-slate-700 text-slate-500'
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.288Z" />
                </svg>
              </button>
            </div>
            <p className="mt-1.5 text-center text-xs text-slate-600">
              Enter para enviar · Shift+Enter para nueva línea
            </p>
          </form>
        </MotionDiv>
      </div>
    </>
  )
}

export default IaChatPanel
