import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

type Theme = "dark" | "light"

const STORAGE_KEY = "another-world-theme"

const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
} | null>(null)

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark"
  const stored = sessionStorage.getItem(STORAGE_KEY) as Theme | null
  return stored === "light" ? "light" : "dark"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    sessionStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
