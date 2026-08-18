import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export const useTheme = () => useContext(ThemeContext)

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(
    () => (localStorage.getItem('weldix_theme') ?? 'light') === 'dark'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => {
    const next = !isDark
    localStorage.setItem('weldix_theme', next ? 'dark' : 'light')
    if (!document.startViewTransition) {
      setIsDark(next)
      return
    }
    document.startViewTransition(() => setIsDark(next))
  }

  return <ThemeContext.Provider value={{ isDark, toggleTheme }}>{children}</ThemeContext.Provider>
}
