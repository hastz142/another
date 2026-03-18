import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import {
  Type,
  Bold,
  AlignCenter,
  AlignLeft,
  AlignRight,
  List,
  ListOrdered,
  Sparkles,
  Code,
  SquareCode,
  SquareDashedBottomCode,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type SlashCommandItem = {
  id: string
  label: string
  shortcut?: string
  icon: React.ReactNode
  run: () => void
}

type SlashMenuProps = {
  open: boolean
  position: { left: number; top: number } | null
  items: SlashCommandItem[]
  selectedIndex: number
  onSelect: (index: number) => void
  onClose: () => void
}

export function SlashMenu({
  open,
  position,
  items,
  selectedIndex,
  onSelect,
  onClose,
}: SlashMenuProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        onSelect(Math.min(selectedIndex + 1, items.length - 1))
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        onSelect(Math.max(selectedIndex - 1, 0))
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        if (items[selectedIndex]) items[selectedIndex].run()
        onClose()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, selectedIndex, items, onSelect, onClose])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  if (!open || !position || items.length === 0) return null

  const menu = (
    <div
      className="fixed z-[100] min-w-[220px] rounded-lg border border-[var(--aw-border)] bg-[var(--aw-card)]/95 py-1 shadow-xl backdrop-blur-md"
      style={{ left: position.left, top: position.top }}
      role="listbox"
      aria-label="Comandos"
    >
      <div ref={listRef} className="max-h-[280px] overflow-y-auto">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            data-index={i}
            role="option"
            aria-selected={i === selectedIndex}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--aw-text)] transition-colors",
              i === selectedIndex
                ? "bg-[var(--aw-accent)]/20 text-[var(--aw-accent)]"
                : "hover:bg-[var(--aw-border)]/50"
            )}
            onClick={() => {
              item.run()
              onClose()
            }}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--aw-border)]/50 text-[var(--aw-text-muted)]">
              {item.icon}
            </span>
            <span className="flex-1 font-medium">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-[var(--aw-text-muted)]">{item.shortcut}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  return createPortal(menu, document.body)
}

export const SLASH_ICONS = {
  h1: <Type className="size-4" />,
  h2: <Type className="size-4" />,
  h3: <Type className="size-4" />,
  bold: <Bold className="size-4" />,
  center: <AlignCenter className="size-4" />,
  left: <AlignLeft className="size-4" />,
  right: <AlignRight className="size-4" />,
  bullet: <List className="size-4" />,
  ordered: <ListOrdered className="size-4" />,
  code: <Code className="size-4" />,
  codeBlock: <SquareCode className="size-4" />,
  masked: <SquareDashedBottomCode className="size-4" />,
  ai: <Sparkles className="size-4" />,
}
