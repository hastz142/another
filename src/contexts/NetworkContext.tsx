import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

export type NetworkStatus = "ok" | "slow" | "unstable" | "offline" | "server"

const PING_INTERVAL_MS = 30_000
const HISTORY_SIZE = 10
const SLOW_LATENCY_MS = 300
const VERY_SLOW_LATENCY_MS = 800
const JITTER_VARIANCE_MS = 500
const CONSECUTIVE_FAILURES_SERVER = 2

export type PingEntry = { latencyMs: number | null; ok: boolean; at: number }

export type RequestLogEntry = {
  id: string
  url: string
  method: string
  status: number | null
  durationMs: number
  at: number
}

type ConnectionInfo = {
  effectiveType: string | null
  downlinkMb: number | null
  rttMs: number | null
}

type NetworkState = {
  status: NetworkStatus
  lastLatencyMs: number | null
  lastCheckAt: number | null
  isSecure: boolean
  showNotification: boolean
  pingHistory: PingEntry[]
  avgLatencyMs: number | null
  packetLossPct: number | null
  jitterMs: number | null
  lastServerOk: boolean
  lastInternetOk: boolean
  connectionInfo: ConnectionInfo | null
  requestLog: RequestLogEntry[]
}

type NetworkContextValue = NetworkState & {
  dismissNotification: () => void
  triggerCheck: () => Promise<{ latencyMs: number | null; serverOk: boolean; internetOk: boolean }>
  addRequestLog: (entry: Omit<RequestLogEntry, "id" | "at">) => void
  clearRequestLog: () => void
}

const NetworkContext = createContext<NetworkContextValue | null>(null)

function getConnectionInfo(): ConnectionInfo | null {
  if (typeof navigator === "undefined" || !(navigator as unknown as { connection?: { effectiveType?: string; downlink?: number; rtt?: number } }).connection) {
    return null
  }
  const c = (navigator as unknown as { connection: { effectiveType?: string; downlink?: number; rtt?: number } }).connection
  return {
    effectiveType: c.effectiveType ?? null,
    downlinkMb: typeof c.downlink === "number" ? c.downlink : null,
    rttMs: typeof c.rtt === "number" ? c.rtt : null,
  }
}

function createTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return (AbortSignal as { timeout(ms: number): AbortSignal }).timeout(ms)
  }
  const c = new AbortController()
  setTimeout(() => c.abort(), ms)
  return c.signal
}

async function pingInternal(): Promise<{ latencyMs: number | null; ok: boolean }> {
  const start = performance.now()
  try {
    const res = await fetch("/api/ping", {
      method: "GET",
      cache: "no-store",
      signal: createTimeoutSignal(10_000),
    })
    const end = performance.now()
    const latencyMs = res.ok ? Math.round(end - start) : null
    return { latencyMs, ok: res.ok }
  } catch {
    return { latencyMs: null, ok: false }
  }
}

async function pingExternal(): Promise<boolean> {
  try {
    const res = await fetch("/api/ping-external", {
      method: "GET",
      cache: "no-store",
      signal: createTimeoutSignal(8_000),
    })
    const data = await res.json().catch(() => ({}))
    return data?.ok === true
  } catch {
    return false
  }
}

function getIsSecure(): boolean {
  if (typeof window === "undefined") return false
  return window.location.protocol === "https:"
}

function computeDerived(history: PingEntry[]): {
  avgLatencyMs: number | null
  packetLossPct: number | null
  jitterMs: number | null
} {
  const okEntries = history.filter((e) => e.ok && e.latencyMs != null) as { latencyMs: number }[]
  const total = history.length
  const failures = history.filter((e) => !e.ok).length
  const packetLossPct = total > 0 ? Math.round((failures / total) * 100) : null
  let avgLatencyMs: number | null = null
  let jitterMs: number | null = null
  if (okEntries.length > 0) {
    const sum = okEntries.reduce((a, e) => a + e.latencyMs, 0)
    avgLatencyMs = Math.round(sum / okEntries.length)
    if (okEntries.length >= 2) {
      const values = okEntries.map((e) => e.latencyMs)
      const min = Math.min(...values)
      const max = Math.max(...values)
      jitterMs = max - min
    }
  }
  return { avgLatencyMs, packetLossPct, jitterMs }
}

function deriveStatus(
  online: boolean,
  serverOk: boolean,
  internetOk: boolean,
  history: PingEntry[],
  consecutiveServerFailures: number
): NetworkStatus {
  if (!online) return "offline"
  if (!serverOk && internetOk && consecutiveServerFailures >= 1) return "server"
  if (!serverOk && !internetOk) return "offline"
  const { avgLatencyMs, jitterMs } = computeDerived(history)
  if (jitterMs != null && jitterMs >= JITTER_VARIANCE_MS) return "unstable"
  if (avgLatencyMs != null) {
    if (avgLatencyMs >= VERY_SLOW_LATENCY_MS) return "slow"
    if (avgLatencyMs >= SLOW_LATENCY_MS) return "slow"
  }
  return "ok"
}

let requestLogId = 0
function nextRequestLogId() {
  return `req-${Date.now()}-${++requestLogId}`
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NetworkState>({
    status: "ok",
    lastLatencyMs: null,
    lastCheckAt: null,
    isSecure: getIsSecure(),
    showNotification: false,
    pingHistory: [],
    avgLatencyMs: null,
    packetLossPct: null,
    jitterMs: null,
    lastServerOk: true,
    lastInternetOk: true,
    connectionInfo: typeof navigator !== "undefined" ? getConnectionInfo() : null,
    requestLog: [],
  })
  const prevStatusRef = useRef<NetworkStatus>("ok")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const consecutiveServerFailuresRef = useRef(0)
  const isMountedRef = useRef(true)

  const runCheck = useCallback(async () => {
    const online = typeof navigator !== "undefined" && navigator.onLine
    if (!online) {
      consecutiveServerFailuresRef.current = 0
      if (isMountedRef.current) {
        setState((s) => ({
          ...s,
          status: "offline",
          lastLatencyMs: null,
          lastCheckAt: Date.now(),
          lastServerOk: false,
          lastInternetOk: false,
          pingHistory: [...s.pingHistory.slice(-(HISTORY_SIZE - 1)), { latencyMs: null, ok: false, at: Date.now() }],
          ...computeDerived([...s.pingHistory.slice(-(HISTORY_SIZE - 1)), { latencyMs: null, ok: false, at: Date.now() }]),
        }))
      }
      return { latencyMs: null, serverOk: false, internetOk: false }
    }

    const [internalResult, internetOk] = await Promise.all([pingInternal(), pingExternal()])
    const { latencyMs, ok: serverOk } = internalResult

    if (serverOk) consecutiveServerFailuresRef.current = 0
    else consecutiveServerFailuresRef.current += 1

    const consecutiveFailures = consecutiveServerFailuresRef.current
    const entry: PingEntry = { latencyMs, ok: serverOk, at: Date.now() }

    if (isMountedRef.current) {
      setState((s) => {
        const nextHistory = [...s.pingHistory, entry].slice(-HISTORY_SIZE)
        const derived = computeDerived(nextHistory)
        const status = deriveStatus(online, serverOk, internetOk, nextHistory, consecutiveFailures)
        return {
          ...s,
          status,
          lastLatencyMs: latencyMs ?? s.lastLatencyMs,
          lastCheckAt: Date.now(),
          lastServerOk: serverOk,
          lastInternetOk: internetOk,
          pingHistory: nextHistory,
          ...derived,
        }
      })
    }
    return { latencyMs, serverOk, internetOk }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    runCheck()
    intervalRef.current = setInterval(runCheck, PING_INTERVAL_MS)
    return () => {
      isMountedRef.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [runCheck])

  useEffect(() => {
    const onOnline = () => {
      runCheck()
    }
    const onOffline = () => {
      setState((s) => ({
        ...s,
        status: "offline",
        lastInternetOk: false,
        lastServerOk: false,
      }))
    }
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [runCheck])

  useEffect(() => {
    const { status } = state
    const bad = status === "slow" || status === "unstable" || status === "offline" || status === "server"
    if (bad && prevStatusRef.current === "ok") {
      setState((s) => ({ ...s, showNotification: true }))
    }
    prevStatusRef.current = status
  }, [state.status])

  const dismissNotification = useCallback(() => {
    setState((s) => ({ ...s, showNotification: false }))
  }, [])

  const triggerCheck = useCallback(async () => {
    return runCheck()
  }, [runCheck])

  const addRequestLog = useCallback((entry: Omit<RequestLogEntry, "id" | "at">) => {
    if (!isMountedRef.current) return
    const full: RequestLogEntry = {
      ...entry,
      id: nextRequestLogId(),
      at: Date.now(),
    }
    setState((s) => ({
      ...s,
      requestLog: [...s.requestLog, full].slice(-50),
    }))
  }, [])

  const clearRequestLog = useCallback(() => {
    setState((s) => ({ ...s, requestLog: [] }))
  }, [])

  const addRequestLogRef = useRef(addRequestLog)
  addRequestLogRef.current = addRequestLog
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = function (...args: Parameters<typeof fetch>) {
      const [input, init] = args
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input)
      const method = (init?.method ?? (input instanceof Request ? input.method : undefined) ?? "GET").toUpperCase()
      const start = performance.now()
      return originalFetch.apply(this, args).then(
        (res) => {
          const durationMs = Math.round(performance.now() - start)
          if (url.startsWith("/api/") || url.includes("/api/")) {
            addRequestLogRef.current({
              url: url.replace(window.location.origin, "").slice(0, 80),
              method,
              status: res.status,
              durationMs,
            })
          }
          return res
        },
        (err) => {
          const durationMs = Math.round(performance.now() - start)
          if (url.startsWith("/api/") || url.includes("/api/")) {
            addRequestLogRef.current({ url: url.replace(window.location.origin, "").slice(0, 80), method, status: null, durationMs })
          }
          throw err
        }
      )
    }
    return () => {
      window.fetch = originalFetch
    }
  }, [])

  const value: NetworkContextValue = {
    ...state,
    dismissNotification,
    triggerCheck,
    addRequestLog,
    clearRequestLog,
  }

  return (
    <NetworkContext.Provider value={value}>
      {children}
      <NetworkNotification />
    </NetworkContext.Provider>
  )
}

function NetworkNotification() {
  const ctx = useContext(NetworkContext)
  if (!ctx) return null
  const { status, showNotification, dismissNotification } = ctx
  if (!showNotification || status === "ok") return null
  const messages: Record<Exclude<NetworkStatus, "ok">, string> = {
    offline: "Conexão inacessível. Verifique sua rede e o roteador.",
    server: "O servidor não está a responder. A internet parece estar disponível.",
    slow: "Latência alta. A conexão está lenta.",
    unstable: "Conexão instável. A latência está a oscilar muito.",
  }
  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-[9999] max-w-sm rounded-lg border border-[var(--aw-border)] bg-[var(--aw-card)] p-4 shadow-lg"
    >
      <p className="text-sm font-medium text-[var(--aw-text)]">{messages[status]}</p>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={dismissNotification}
          className="rounded-md bg-[var(--aw-border)] px-3 py-1.5 text-sm font-medium text-[var(--aw-text)] hover:bg-[var(--aw-border)]/80"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}

export function useNetwork() {
  const ctx = useContext(NetworkContext)
  if (!ctx) throw new Error("useNetwork must be used within NetworkProvider")
  return ctx
}
