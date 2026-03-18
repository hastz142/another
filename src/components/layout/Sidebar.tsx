import { Link, useLocation } from "react-router-dom"
import {
  Home,
  FileSearch,
  KeyRound,
  Wallet,
  Wifi,
  Moon,
  Sun,
  ListChecks,
  MessageSquare,
  PanelLeftClose,
  FileText,
  Bookmark,
  Lightbulb,
  Timer,
  Coffee,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/contexts/ThemeContext"
import { useNetwork } from "@/contexts/NetworkContext"

const mainNavItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/mesa-de-investigacao", label: "Mesa de Investigação", icon: FileSearch },
  { to: "/notas", label: "Notas", icon: FileText },
  { to: "/checklists", label: "Checklists", icon: ListChecks },
  { to: "/fluxos", label: "Fluxos", icon: MessageSquare },
  { to: "/senhas", label: "Senhas", icon: KeyRound },
  { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { to: "/ideias", label: "Ideias", icon: Lightbulb },
  { to: "/pomodoro", label: "Pomodoro", icon: Timer },
  { to: "/descanso", label: "Tela de descanso", icon: Coffee },
  { to: "/rede", label: "Rede", icon: Wifi },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
]

export function Sidebar({
  onClose,
}: {
  onClose?: () => void
}) {
  const location = useLocation()
  const pathname = location.pathname
  const { theme, toggleTheme } = useTheme()
  const { status } = useNetwork()
  const statusColor =
    status === "ok"
      ? "bg-[var(--aw-positive)]"
      : status === "slow" || status === "unstable"
        ? "bg-amber-500"
        : "bg-[var(--aw-danger)]"

  return (
    <aside className="flex h-full w-56 flex-col border-r border-[var(--aw-border)] bg-[var(--aw-card)]">
      <div className="flex h-14 items-center justify-between gap-2 border-b border-[var(--aw-border)] px-4">
        <span className="min-w-0 truncate font-semibold text-[var(--aw-text)]">Another World</span>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            to="/rede"
            title="Status da rede"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-80",
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
            onClick={toggleTheme}
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {mainNavItems.map(({ to, label, icon: Icon }) => {
          const isActive = to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/")
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--aw-border)] text-[var(--aw-text)]"
                  : "text-[var(--aw-text-muted)] hover:bg-[var(--aw-border)]/50 hover:text-[var(--aw-text)]"
              )}
            >
              <Icon className="size-5 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {onClose && (
        <div className="shrink-0 border-t border-[var(--aw-border)] p-2">
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--aw-border)]/60 px-3 py-2.5 text-sm font-medium text-[var(--aw-text)] transition-colors hover:bg-[var(--aw-border)]"
            title="Recolher barra lateral"
          >
            <PanelLeftClose className="size-4 shrink-0" />
            Recolher barra lateral
          </button>
        </div>
      )}
    </aside>
  )
}
