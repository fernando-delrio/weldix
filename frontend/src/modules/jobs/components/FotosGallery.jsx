import { useState } from 'react'
import { useFotos } from '../hooks/useFotos'

const cardBase = 'rounded-xl border border-cyan-900/50 bg-slate-900/65 p-5'

const ETIQUETAS = ['antes', 'durante', 'despues']
const etiquetaLabel = { antes: 'Antes', durante: 'Durante', despues: 'Después' }

// ── Lightbox: vista a pantalla completa ────────────────────────────────────────
const Lightbox = ({ foto, onClose, onDelete }) => (
  <div
    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur"
    onClick={onClose}
  >
    <img
      src={foto.url}
      alt={foto.etiqueta}
      className="max-h-[80vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    />
    <div className="mt-4 flex gap-3" onClick={(e) => e.stopPropagation()}>
      <span className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-[0.65rem] uppercase tracking-widest text-slate-400">
        {etiquetaLabel[foto.etiqueta] ?? foto.etiqueta}
      </span>
      {foto.uploader_nombre && (
        <span className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-[0.65rem] text-slate-400">
          {foto.uploader_nombre}
        </span>
      )}
      <button
        type="button"
        onClick={() => { onDelete(foto.id); onClose() }}
        className="rounded-md border border-rose-700/50 bg-rose-500/10 px-3 py-1 text-[0.65rem] uppercase tracking-widest text-rose-400 transition hover:bg-rose-500/20"
      >
        Eliminar
      </button>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="mt-4 text-xs uppercase tracking-widest text-slate-500 hover:text-slate-300"
    >
      Cerrar
    </button>
  </div>
)

// ── Selector de etiqueta para la subida ────────────────────────────────────────
const EtiquetaSelector = ({ selected, onChange }) => (
  <div className="flex gap-1.5">
    {ETIQUETAS.map((e) => (
      <button
        key={e}
        type="button"
        onClick={() => onChange(e)}
        className={`rounded-md border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-widest transition ${
          selected === e
            ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
            : 'border-slate-700 bg-slate-800/60 text-slate-500 hover:text-slate-300'
        }`}
      >
        {etiquetaLabel[e]}
      </button>
    ))}
  </div>
)

// ── Miniatura de foto ─────────────────────────────────────────────────────────
const FotoThumb = ({ foto, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(foto)}
    className="group relative aspect-square overflow-hidden rounded-lg border border-slate-800 bg-slate-800/60 transition hover:border-sky-500/50"
  >
    <img
      src={foto.url}
      alt={foto.etiqueta}
      className="h-full w-full object-cover transition group-hover:scale-105"
    />
    <span className="absolute bottom-0 left-0 right-0 bg-slate-900/80 px-1.5 py-0.5 text-center text-[0.55rem] uppercase tracking-widest text-slate-400">
      {etiquetaLabel[foto.etiqueta] ?? foto.etiqueta}
    </span>
  </button>
)

// ── Componente principal ───────────────────────────────────────────────────────
const FotosGallery = ({ jobId }) => {
  // etiqueta seleccionada vive aquí, no en el hook — es estado puro de UI
  const [etiqueta, setEtiqueta] = useState('durante')

  const {
    fotos, isLoading, isUploading, lightbox, error,
    fileInputRef, abrirLightbox, cerrarLightbox, eliminarFoto, subirFoto,
  } = useFotos(jobId)

  // Al seleccionar archivo, usamos la etiqueta actual del selector
  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) subirFoto(file, etiqueta)
    e.target.value = ''
  }

  return (
    <section className={cardBase}>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        Fotos del trabajo
        {fotos.length > 0 && (
          <span className="ml-2 text-slate-600">({fotos.length})</span>
        )}
      </h2>

      {error && <p className="mb-3 text-xs text-rose-400">{error}</p>}

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="aspect-square animate-pulse rounded-lg bg-slate-800" />
          ))}
        </div>
      ) : (
        <>
          {fotos.length > 0 ? (
            <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {fotos.map((foto) => (
                <FotoThumb key={foto.id} foto={foto} onClick={abrirLightbox} />
              ))}
            </div>
          ) : (
            <p className="mb-4 text-sm text-slate-600">Sin fotos aún</p>
          )}

          {/* Selector de etiqueta + botón de subida */}
          <div className="space-y-2">
            <EtiquetaSelector selected={etiqueta} onChange={setEtiqueta} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-800/30 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500 transition hover:border-sky-500/50 hover:text-sky-400 disabled:opacity-50"
            >
              {isUploading ? 'Subiendo...' : '+ Añadir foto'}
            </button>
            {/* capture="environment" abre la cámara trasera en móvil/tablet */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        </>
      )}

      {lightbox && (
        <Lightbox
          foto={lightbox}
          onClose={cerrarLightbox}
          onDelete={eliminarFoto}
        />
      )}
    </section>
  )
}

export default FotosGallery
