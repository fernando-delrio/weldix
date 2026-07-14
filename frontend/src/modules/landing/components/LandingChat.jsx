import { useEffect, useRef, useState } from 'react'

import { cx } from '../../core/lib/cx'
import { CONTACT_EMAIL, SUGGESTED, useLandingChat } from '../hooks/useLandingChat'

// ── Subcomponentes nombrados ────────────────────────────────────────────────
const emptyState = (t, onAsk) => (
  <div className="space-y-4">
    <div className={cx('rounded-xl border px-4 py-3 text-sm leading-relaxed', t.card, t.muted)}>
      ¡Hola! 👋 Soy el asistente de Weldix. Pregúntame lo que quieras sobre precios, funciones o
      cómo empezar.
    </div>
    <div className="flex flex-wrap gap-2">
      {SUGGESTED.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onAsk(q)}
          className={cx(
            'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
            t.accentBorder,
            t.accent,
            'hover:bg-white/[0.04]'
          )}
        >
          {q}
        </button>
      ))}
    </div>
  </div>
)

const messageBubble = (msg, index, t) => {
  const isUser = msg.role === 'user'
  return (
    <div key={index} className={cx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cx(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser ? cx(t.accentBg, t.accentBgText) : cx('border', t.card, t.muted)
        )}
      >
        {msg.content}
      </div>
    </div>
  )
}

const typingIndicator = (isSending, t) =>
  isSending && (
    <div className="flex justify-start">
      <div className={cx('rounded-2xl border px-4 py-3', t.card)}>
        <span className={cx('inline-flex gap-1', t.faint)}>
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0.3s]" />
        </span>
      </div>
    </div>
  )

const contactCta = (show, error, t) =>
  (show || error) && (
    <div
      className={cx(
        'rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed',
        t.accentBorder,
        t.accentTint
      )}
    >
      {error ? (
        <span className={t.muted}>{error} </span>
      ) : (
        <span className={t.muted}>¿Tienes varias dudas? Lo mejor es que hablemos. </span>
      )}
      <a
        href={`mailto:${CONTACT_EMAIL}?subject=Consulta%20sobre%20Weldix`}
        className={cx('font-bold underline', t.accent)}
      >
        {CONTACT_EMAIL}
      </a>
    </div>
  )

// ── Componente principal ─────────────────────────────────────────────────────
const LandingChat = ({ t }) => {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, isSending, error, showContact, send } = useLandingChat()
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  const submit = (event) => {
    event.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    send(text)
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9600] flex flex-col items-end">
      {open && (
        <div
          className={cx(
            'mb-3 flex h-[32rem] max-h-[80vh] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl',
            t.card
          )}
        >
          {/* Cabecera */}
          <div className={cx('flex items-center justify-between border-b px-4 py-3', t.divider)}>
            <div className="flex items-center gap-2">
              <span
                className={cx('flex h-8 w-8 items-center justify-center rounded-lg', t.accentTint)}
              >
                <i className={cx('bx bx-bot text-lg', t.accent)} aria-hidden="true" />
              </span>
              <div>
                <p className={cx('text-sm font-bold', t.headline)}>Weldix AI</p>
                <p className={cx('text-[0.65rem]', t.faint)}>Responde al instante</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              className={cx('flex h-8 w-8 items-center justify-center rounded-lg', t.navText)}
            >
              <i className="bx bx-x text-xl" aria-hidden="true" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && emptyState(t, send)}
            {messages.map((msg, index) => messageBubble(msg, index, t))}
            {typingIndicator(isSending, t)}
            {contactCta(showContact, error, t)}
            <div ref={endRef} />
          </div>

          {/* Entrada */}
          <form
            onSubmit={submit}
            className={cx('flex items-center gap-2 border-t px-3 py-3', t.divider)}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta…"
              aria-label="Escribe tu pregunta"
              maxLength={500}
              className={cx(
                'flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none',
                t.divider,
                t.headline
              )}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              aria-label="Enviar"
              className={cx(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition disabled:opacity-40',
                t.btnPrimary
              )}
            >
              <i className="bx bx-send text-lg" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}

      {/* Botón flotante */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar chat' : 'Abrir chat de ayuda'}
        className={cx(
          'flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition active:scale-95',
          t.btnPrimary
        )}
      >
        <i className={cx('bx text-2xl', open ? 'bx-x' : 'bx-message-dots')} aria-hidden="true" />
      </button>
    </div>
  )
}

export default LandingChat
