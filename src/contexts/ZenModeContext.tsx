import { createContext, useContext, useState, useCallback } from "react"

type ZenModeContextValue = {
  zenMode: boolean
  toggleZenMode: () => void
}

const ZenModeContext = createContext<ZenModeContextValue | null>(null)

export function ZenModeProvider({ children }: { children: React.ReactNode }) {
  const [zenMode, setZenMode] = useState(false)
  const toggleZenMode = useCallback(() => setZenMode((v) => !v), [])
  return (
    <ZenModeContext.Provider value={{ zenMode, toggleZenMode }}>
      {children}
    </ZenModeContext.Provider>
  )
}

export function useZenMode() {
  const ctx = useContext(ZenModeContext)
  return ctx ?? { zenMode: false, toggleZenMode: () => {} }
}
