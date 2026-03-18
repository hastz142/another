import { useState, useEffect } from "react"
import { Link, Outlet } from "react-router-dom"
import { PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "./Sidebar"
import { RestScreen } from "@/components/rest/RestScreen"
import { useNetwork } from "@/contexts/NetworkContext"
import { useZenMode } from "@/contexts/ZenModeContext"
import { cn } from "@/lib/utils"

const SIDEBAR_OPEN_KEY = "another-world-sidebar-open"

function readSidebarOpen(): boolean {
  try {
    const v = sessionStorage.getItem(SIDEBAR_OPEN_KEY)
    return v === null ? true : v === "true"
  } catch {
    return true
  }
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen)
  const { zenMode } = useZenMode()
  const { status } = useNetwork()
  const statusColor =
    status === "ok"
      ? "bg-[var(--aw-positive)]"
      : status === "slow" || status === "unstable"
        ? "bg-amber-500"
        : "bg-[var(--aw-danger)]"

  useEffect(() => {
    sessionStorage.setItem(SIDEBAR_OPEN_KEY, String(sidebarOpen))
  }, [sidebarOpen])

  return (
    <div className="relative flex h-screen w-full overflow-hidden">
      <RestScreen />
      {!zenMode && sidebarOpen && (
        <Sidebar onClose={() => setSidebarOpen(false)} />
      )}
      {!zenMode && !sidebarOpen && (
        <aside className="flex h-full w-14 flex-col border-r border-[var(--aw-border)] bg-[var(--aw-card)]/80">
          <div className="flex-1" aria-hidden />
          <div className="flex shrink-0 flex-col items-center gap-1 border-t border-[var(--aw-border)] p-2">
            <Link
              to="/rede"
              title="Status da rede"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-opacity hover:opacity-80",
                "focus:outline-none focus:ring-2 focus:ring-[var(--aw-accent)]"
              )}
              aria-label="Ver status da rede"
            >
              <span className={cn("size-2.5 rounded-full ring-2 ring-[var(--aw-card)]", statusColor)} />
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              title="Abrir barra lateral"
              className="h-10 w-10 rounded-lg text-[var(--aw-text-muted)] hover:bg-[var(--aw-border)]/50 hover:text-[var(--aw-text)]"
            >
              <PanelLeftOpen className="size-5" />
            </Button>
          </div>
        </aside>
      )}
      <main className="flex-1 overflow-auto bg-[var(--aw-bg)]">
        <Outlet />
      </main>
    </div>
  )
}
