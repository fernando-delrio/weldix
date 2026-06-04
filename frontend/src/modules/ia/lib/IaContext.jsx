import { createContext, useContext, useState } from 'react'

const IaContext = createContext({
  isOpen: false,
  pageContext: null,
  openChat: () => {},
  closeChat: () => {},
  setPageContext: () => {},
})

export const IaProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [pageContext, setPageContext] = useState(null)

  // contextoSeccion: { seccion, resumen, sugerencias } — datos de la página activa para la IA
  const openChat = (contextoSeccion = null) => {
    if (contextoSeccion) setPageContext(contextoSeccion)
    setIsOpen(true)
  }

  const closeChat = () => setIsOpen(false)

  return (
    <IaContext.Provider value={{ isOpen, pageContext, openChat, closeChat, setPageContext }}>
      {children}
    </IaContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useIaContext = () => useContext(IaContext)
