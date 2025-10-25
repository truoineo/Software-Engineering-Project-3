import React from 'react'

const ThemeContext = React.createContext(null)
const STORAGE_KEY = 'app-theme'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = React.useState(getInitialTheme)

  React.useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const handler = event => {
      setTheme(prev => {
        const next = event.matches ? 'dark' : 'light'
        if (prev === next) return prev
        return next
      })
    }
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    query.addEventListener('change', handler)
    return () => query.removeEventListener('change', handler)
  }, [])

  const toggleTheme = React.useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = React.useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
