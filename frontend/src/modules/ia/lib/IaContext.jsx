import { createContext, useContext, useState } from 'react'

// pageContext shape: { seccion: string, resumen: string, sugerencias: string[] }
const IaContext = createContext({
  isOpen:         false,
  pageContext:    null,
  openChat:       () => {},
  closeChat:      () => {},
  setPageContext: () => {},
})

export const IaProvider = ({ children }) => {
  const [isOpen, setIsOpen]           = useState(false)
  const [pageContext, setPageContext]  = useState(null)

  // openChat acepta un objeto pageContext opcional
  // { seccion, resumen, sugerencias } — si se pasa, reemplaza el contexto actual
  const openChat  = (ctx = null) => { if (ctx) setPageContext(ctx); setIsOpen(true) }
  const closeChat = ()           => { setIsOpen(false) }

  return (
    <IaContext.Provider value={{ isOpen, pageContext, openChat, closeChat, setPageContext }}>
      {children}
    </IaContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useIaContext = () => useContext(IaContext)
