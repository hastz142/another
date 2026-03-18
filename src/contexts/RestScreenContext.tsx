"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  loadRestScreenConfig,
  saveRestScreenConfig,
  type RestScreenConfig,
} from "@/config/restScreenConfig"

type RestScreenContextValue = {
  show: boolean
  setShow: (v: boolean) => void
  config: RestScreenConfig
  setConfig: (c: RestScreenConfig | ((prev: RestScreenConfig) => RestScreenConfig)) => void
  /** Abre a tela de descanso (atalho manual). */
  openRestScreen: () => void
}

const RestScreenContext = createContext<RestScreenContextValue | null>(null)

const IDLE_CHECK_MS = 15_000 // verificar a cada 15s

export function RestScreenProvider({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false)
  const [config, setConfigState] = useState<RestScreenConfig>(loadRestScreenConfig)
  const lastActivityRef = useRef(Date.now())
  const idleCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const setConfig = useCallback(
    (next: RestScreenConfig | ((prev: RestScreenConfig) => RestScreenConfig)) => {
      setConfigState((prev) => {
        const newConfig = typeof next === "function" ? next(prev) : next
        saveRestScreenConfig(newConfig)
        return newConfig
      })
    },
    []
  )

  const openRestScreen = useCallback(() => setShow(true), [])

  // Atualizar última atividade em movimentos/teclas/toques
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"]
    events.forEach((e) => window.addEventListener(e, updateActivity))
    return () => events.forEach((e) => window.removeEventListener(e, updateActivity))
  }, [])

  // Timer de inatividade: se passou idleMinutes, mostrar tela (só se enabled e não estiver já visível)
  useEffect(() => {
    if (!config.enabled) {
      if (idleCheckRef.current) {
        clearInterval(idleCheckRef.current)
        idleCheckRef.current = null
      }
      return
    }
    const interval = setInterval(() => {
      if (show) return
      const elapsed = (Date.now() - lastActivityRef.current) / 1000 / 60
      if (elapsed >= config.idleMinutes) {
        setShow(true)
      }
    }, IDLE_CHECK_MS)
    idleCheckRef.current = interval
    return () => {
      if (idleCheckRef.current) clearInterval(idleCheckRef.current)
    }
  }, [config.enabled, config.idleMinutes, show])

  // Atalho Alt+P (ou o que estiver em config.shortcut) para abrir a tela
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault()
        openRestScreen()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [openRestScreen])

  const value: RestScreenContextValue = {
    show,
    setShow,
    config,
    setConfig,
    openRestScreen,
  }

  return (
    <RestScreenContext.Provider value={value}>
      {children}
    </RestScreenContext.Provider>
  )
}

export function useRestScreen() {
  const ctx = useContext(RestScreenContext)
  if (!ctx) throw new Error("useRestScreen must be used within RestScreenProvider")
  return ctx
}

/** Versão que não lança erro fora do provider (retorna null). Usar em RestScreen para evitar crash durante HMR/StrictMode. */
export function useOptionalRestScreen(): RestScreenContextValue | null {
  return useContext(RestScreenContext)
}
