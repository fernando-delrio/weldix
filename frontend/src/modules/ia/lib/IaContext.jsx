import { createContext, useContext, useState } from 'react'

const IaContext = createContext({
  isOpen:       false,
  jobContext:   null,
  openChat:     () => {},
  closeChat:    () => {},
  setJobContext: () => {},
})

export const IaProvider = ({ children }) => {
  const [isOpen, setIsOpen]         = useState(false)
  const [jobContext, setJobContext]  = useState(null)

  const openChat  = (ctx = null) => { if (ctx) setJobContext(ctx); setIsOpen(true) }
  const closeChat = ()           => { setIsOpen(false) }

  return (
    <IaContext.Provider value={{ isOpen, jobContext, openChat, closeChat, setJobContext }}>
      {children}
    </IaContext.Provider>
  )
}

export const useIaContext = () => useContext(IaContext)
