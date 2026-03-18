import { useState, useCallback, useMemo, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Pin, PinOff, LayoutGrid, List, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiGetNotas, apiPostNota, apiPutNota, type NotaItemApi } from "@/lib/api"
import type { NotaItem } from "./notepadData"
import { stripHtml, previewText, formatRelativeTime } from "./notasUtils"

type ViewMode = "grid" | "list"

function getFilteredAndSorted(
  notas: NotaItem[],
  searchQuery: string,
  selectedTag: string | null
) {
  const q = searchQuery.trim().toLowerCase()
  const filtered = notas.filter((n) => {
    const matchSearch =
      !q ||
      (n.title || "").toLowerCase().includes(q) ||
      stripHtml(n.content || "").toLowerCase().includes(q)
    const matchTag = !selectedTag || (n.tags && n.tags.includes(selectedTag))
    return matchSearch && matchTag
  })
  const pinned = filtered
    .filter((n) => n.pinned)
    .sort((a, b) => (a.pinnedOrder ?? 999) - (b.pinnedOrder ?? 999))
  const others = filtered
    .filter((n) => !n.pinned)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  return { pinned, others }
}

function allTags(notas: NotaItem[]): string[] {
  const set = new Set<string>()
  notas.forEach((n) => (n.tags ?? []).forEach((t) => set.add(t)))
  return Array.from(set).sort()
}

// ---- Card de nota (grid) ----
function NotaCard({
  nota,
  isPinned,
  onPinClick,
  onNavigate,
  isSortable,
  sortableProps,
}: {
  nota: NotaItem
  isPinned: boolean
  onPinClick: (e: React.MouseEvent) => void
  onNavigate: () => void
  isSortable?: boolean
  sortableProps?: {
    attributes: Record<string, unknown>
    listeners: Record<string, unknown>
    setNodeRef: (el: HTMLDivElement | null) => void
    style: React.CSSProperties
  }
}) {
  const preview = previewText(nota.content || "", 180)
  const tag = (nota.tags && nota.tags[0]) || "Geral"
  const dateStr = formatRelativeTime(nota.updatedAt ?? 0)

  const card = (
    <Card
      className={cn(
        "card-nota group relative h-full cursor-pointer rounded-xl border transition-all duration-300 ease-out",
        "bg-[var(--aw-card)]/95 border-[var(--aw-border)]",
        "hover:border-[var(--aw-accent)]/60 hover:shadow-lg hover:-translate-y-0.5",
        isPinned && "border-[var(--aw-accent)]/40 bg-[var(--aw-card)]"
      )}
      onClick={onNavigate}
      ref={sortableProps?.setNodeRef}
      style={sortableProps?.style}
      {...(isSortable ? sortableProps?.attributes : {})}
      {...(isSortable ? sortableProps?.listeners : {})}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2 pr-8">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--aw-border)]/80 text-[var(--aw-text-muted)]">
            <FileText className="size-4" />
          </div>
          <CardTitle className="truncate text-base font-medium">{nota.title || "Sem título"}</CardTitle>
        </div>
        <button
          type="button"
          aria-label={isPinned ? "Desfixar" : "Fixar"}
          className={cn(
            "pin-button absolute right-3 top-3 rounded p-1.5 text-[var(--aw-text-muted)] transition-opacity",
            "hover:bg-[var(--aw-border)]/50 hover:text-[var(--aw-accent)]",
            isPinned ? "opacity-100 text-amber-500" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={onPinClick}
        >
          {isPinned ? (
            <Pin className="size-4 rotate-45 fill-current" />
          ) : (
            <PinOff className="size-4" />
          )}
        </button>
      </CardHeader>
      <CardContent className="pt-0">
        <p
          className="preview-text line-clamp-3 text-sm leading-relaxed text-[var(--aw-text-muted)]"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {preview || "Sem conteúdo."}
        </p>
      </CardContent>
      <CardFooter className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-xs text-[var(--aw-text-muted)]">
        <span className="rounded-full bg-[var(--aw-border)]/60 px-2 py-0.5">{tag}</span>
        <span>•</span>
        <span>{dateStr}</span>
      </CardFooter>
    </Card>
  )
  return card
}

// ---- Card sortable (para seção Fixados) ----
function SortableNotaCardFixed({
  nota,
  onPinClick,
  onNavigate,
}: {
  nota: NotaItem
  onPinClick: (e: React.MouseEvent) => void
  onNavigate: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: nota.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onPinClick(e)
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <NotaCard nota={nota} isPinned={true} onPinClick={handlePin} onNavigate={onNavigate} />
    </div>
  )
}

// ---- Linha de nota (vista lista) ----
function NotaListRow({
  nota,
  isPinned,
  onPinClick,
  onNavigate,
}: {
  nota: NotaItem
  isPinned: boolean
  onPinClick: (e: React.MouseEvent) => void
  onNavigate: () => void
}) {
  const preview = stripHtml(nota.content || "").slice(0, 80) + (stripHtml(nota.content || "").length > 80 ? "…" : "")
  const tag = (nota.tags && nota.tags[0]) || "Geral"
  const dateStr = formatRelativeTime(nota.updatedAt ?? 0)

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "flex cursor-pointer items-center gap-4 rounded-lg border border-[var(--aw-border)] px-4 py-3 transition-colors",
        "hover:border-[var(--aw-accent)]/50 hover:bg-[var(--aw-card)]/80",
        isPinned && "border-[var(--aw-accent)]/30 bg-[var(--aw-card)]/90"
      )}
      onClick={onNavigate}
      onKeyDown={(e) => e.key === "Enter" && onNavigate()}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--aw-border)]/80 text-[var(--aw-text-muted)]">
        <FileText className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[var(--aw-text)]">{nota.title || "Sem título"}</p>
        <p className="truncate text-sm text-[var(--aw-text-muted)]">{preview || "Sem conteúdo."}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-[var(--aw-text-muted)]">
        <span className="rounded-full bg-[var(--aw-border)]/60 px-2 py-0.5">{tag}</span>
        <span>{dateStr}</span>
      </div>
      <button
        type="button"
        aria-label={isPinned ? "Desfixar" : "Fixar"}
        className={cn(
          "rounded p-1.5 text-[var(--aw-text-muted)] hover:bg-[var(--aw-border)]/50 hover:text-[var(--aw-accent)]",
          isPinned && "text-amber-500"
        )}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onPinClick(e)
        }}
      >
        {isPinned ? <Pin className="size-4 rotate-45 fill-current" /> : <PinOff className="size-4" />}
      </button>
    </div>
  )
}

export function NotepadNotasPage() {
  const navigate = useNavigate()
  const [notas, setNotas] = useState<NotaItemApi[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  const refresh = useCallback(() => {
    apiGetNotas().then(setNotas).catch(() => setNotas([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    apiGetNotas()
      .then((data) => { if (!cancelled) setNotas(data) })
      .catch(() => { if (!cancelled) setNotas([]) })
    return () => { cancelled = true }
  }, [])

  const { pinned, others } = useMemo(
    () => getFilteredAndSorted(notas, searchQuery, selectedTag),
    [notas, searchQuery, selectedTag]
  )
  const tags = useMemo(() => allTags(notas), [notas])

  const createNewNota = useCallback(async () => {
    try {
      const tags = selectedTag ? [selectedTag] : []
      const nova = await apiPostNota({ title: "Nova nota", content: "", tags })
      setNotas((prev) => [nova, ...prev])
      navigate(`/notas/${nova.id}`)
    } catch {}
  }, [navigate, selectedTag])

  const handlePinClick = useCallback(
    (id: string) => async (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const n = notas.find((x) => x.id === id)
      if (!n) return
      try {
        await apiPutNota(id, { pinned: !n.pinned })
        refresh()
      } catch {}
    },
    [notas, refresh]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const pinnedIds = pinned.map((n) => n.id)
      const oldIndex = pinnedIds.indexOf(active.id as string)
      const newIndex = pinnedIds.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1) return
      const newOrder = arrayMove(pinnedIds, oldIndex, newIndex)
      try {
        for (let i = 0; i < newOrder.length; i++) {
          await apiPutNota(newOrder[i], { pinned: true, pinnedOrder: i })
        }
        refresh()
      } catch {}
    },
    [pinned, refresh]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-xl font-semibold text-[var(--aw-text)]">Notas</h1>

        {/* Barra de ferramentas: busca + filtro por categoria ao lado */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--aw-text-muted)]" />
            <Input
              type="search"
              placeholder="Buscar notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-xs text-[var(--aw-text-muted)]">Categoria:</span>
          <button
            type="button"
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              selectedTag === null
                ? "bg-[var(--aw-accent)] text-white"
                : "bg-[var(--aw-border)]/60 text-[var(--aw-text-muted)] hover:bg-[var(--aw-border)]"
            )}
            onClick={() => setSelectedTag(null)}
          >
            Todas
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                selectedTag === tag
                  ? "bg-[var(--aw-accent)] text-white"
                  : "bg-[var(--aw-border)]/60 text-[var(--aw-text-muted)] hover:bg-[var(--aw-border)]"
              )}
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </button>
          ))}
          <div className="ml-auto flex rounded-lg border border-[var(--aw-border)] p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 px-2", viewMode === "grid" && "bg-[var(--aw-border)]/50")}
              onClick={() => setViewMode("grid")}
              aria-label="Visualização em grade"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 px-2", viewMode === "list" && "bg-[var(--aw-border)]/50")}
              onClick={() => setViewMode("list")}
              aria-label="Visualização em lista"
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>

        {/* Seção Fixados */}
        {pinned.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--aw-text-muted)]">
              <Pin className="size-4 rotate-45 fill-amber-500 text-amber-500" />
              Fixados
            </h2>
            {viewMode === "grid" ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={pinned.map((n) => n.id)} strategy={verticalListSortingStrategy}>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pinned.map((nota) => (
                      <SortableNotaCardFixed
                        key={nota.id}
                        nota={nota}
                        onPinClick={handlePinClick(nota.id)}
                        onNavigate={() => navigate(`/notas/${nota.id}`)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="flex flex-col gap-2">
                {pinned.map((nota) => (
                  <NotaListRow
                    key={nota.id}
                    nota={nota}
                    isPinned
                    onPinClick={handlePinClick(nota.id)}
                    onNavigate={() => navigate(`/notas/${nota.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Seção Outras Notas */}
        <section>
          {pinned.length > 0 && (
            <h2 className="mb-3 text-sm font-medium text-[var(--aw-text-muted)]">Outras notas</h2>
          )}
          {viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((nota) => (
                <NotaCard
                  key={nota.id}
                  nota={nota}
                  isPinned={false}
                  onPinClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    apiPutNota(nota.id, { pinned: !nota.pinned }).then(refresh).catch(() => {})
                  }}
                  onNavigate={() => navigate(`/notas/${nota.id}`)}
                />
              ))}

              {/* Card Nova Nota */}
              <Card
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border-dashed border-[var(--aw-border)] py-10 transition-colors",
                  "hover:border-[var(--aw-accent)]/50 hover:bg-[var(--aw-border)]/30"
                )}
                onClick={createNewNota}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--aw-card)] text-[var(--aw-text-muted)] shadow-sm">
                  <Plus className="size-6" />
                </div>
                <p className="mt-3 text-sm font-medium text-[var(--aw-text)]">+ Nova Nota</p>
                <p className="mt-0.5 text-xs text-[var(--aw-text-muted)]">Título e texto</p>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {others.map((nota) => (
                <NotaListRow
                  key={nota.id}
                  nota={nota}
                  isPinned={false}
                  onPinClick={handlePinClick(nota.id)}
                  onNavigate={() => navigate(`/notas/${nota.id}`)}
                />
              ))}
              <div
                role="button"
                tabIndex={0}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--aw-border)] py-6 text-[var(--aw-text-muted)] hover:border-[var(--aw-accent)]/50 hover:bg-[var(--aw-border)]/20"
                onClick={createNewNota}
                onKeyDown={(e) => e.key === "Enter" && createNewNota()}
              >
                <Plus className="size-5" />
                <span className="text-sm font-medium">Nova Nota</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
