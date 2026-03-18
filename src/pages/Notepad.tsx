import { useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import {
  type CustomChecklist,
  type ChecklistItemExport,
} from "./notepad/notepadData"


type ChecklistItem = ChecklistItemExport

/** IDs dos checklists que vêm do banco (infra e fluxo); não mostram botão apagar. */
const BUILT_IN_IDS = ["infra", "fluxo"] as const

/** Estado inicial do mapa de completed; carregar via apiGetNotepadCompleted() nas páginas. */
export const getInitialCompletedMap = (): Record<string, string[]> => ({})

export function getProgress(items: ChecklistItem[], completedIds: Set<string>) {
  const tasks = items.filter((i) => i.type === "task")
  const total = tasks.length
  const done = tasks.filter((t) => t.id && completedIds.has(t.id)).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return { done, total, pct }
}


export type ChecklistViewProps = {
  selectedId: string
  customChecklists: CustomChecklist[]
  setCustomChecklists: React.Dispatch<React.SetStateAction<CustomChecklist[]>>
  /** Guarda o checklist na API e no estado (evita perder dados quando a lista ainda está vazia). */
  onSaveChecklist?: (checklist: CustomChecklist) => void
  completedMap: Record<string, string[]>
  setCompletedFor: (id: string, ids: Set<string>) => void
  getCompletedSet: (id: string) => Set<string>
  goBack: () => void
  newTask: string
  setNewTask: (v: string) => void
  /** Só para checklists custom: apagar o checklist e voltar à lista */
  onDeleteChecklist?: () => void
}

export function NotepadChecklistView({
  selectedId,
  customChecklists,
  setCustomChecklists,
  onSaveChecklist,
  setCompletedFor,
  getCompletedSet,
  goBack,
  newTask,
  setNewTask,
  onDeleteChecklist,
}: ChecklistViewProps) {
  const isBuiltIn = BUILT_IN_IDS.includes(selectedId as (typeof BUILT_IN_IDS)[number])
  const custom = customChecklists.find((c) => c.id === selectedId)

  const [items, setItems] = useState<ChecklistItem[]>(() => (custom ? custom.items : []))

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")
  const [newHeaderText, setNewHeaderText] = useState("")

  const title = custom?.name ?? "Checklist"
  const canEditItems = custom != null
  const canEditTitle = custom != null
  const currentCompleted = getCompletedSet(selectedId)

  useEffect(() => {
    if (custom) setItems(custom.items)
  }, [selectedId, custom])

  const updateCompleted = useCallback(
    (fn: (prev: Set<string>) => Set<string>) => {
      const prev = getCompletedSet(selectedId)
      const next = fn(prev)
      setCompletedFor(selectedId, next)
    },
    [selectedId, setCompletedFor, getCompletedSet]
  )

  const tasks = items.filter((i) => i.type === "task")
  const doneCount = tasks.filter((t) => t.id && currentCompleted.has(t.id)).length
  const totalTasks = tasks.length
  const pct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0

  const toggle = useCallback(
    (id: string) => {
      updateCompleted((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    [updateCompleted]
  )

  const addTask = useCallback(() => {
    const text = newTask.trim()
    if (!text) return
    const newItem: ChecklistItem = {
      type: "task",
      id: `task-${Date.now()}`,
      text,
    }
    setItems((prev) => {
      const next = [...prev, newItem]
      if (!isBuiltIn) {
        if (onSaveChecklist) {
          onSaveChecklist({ id: selectedId, name: title, items: next })
        } else {
          setCustomChecklists((list) =>
            list.map((c) => (c.id === selectedId ? { ...c, items: next } : c))
          )
        }
      }
      return next
    })
    setNewTask("")
  }, [newTask, selectedId, isBuiltIn, setCustomChecklists, onSaveChecklist, title])

  const addHeader = useCallback(() => {
    const text = newHeaderText.trim()
    if (!text) return
    setItems((prev) => {
      const next = [...prev, { type: "header", text, id: `header-${Date.now()}` }]
      if (!isBuiltIn) {
        if (onSaveChecklist) {
          onSaveChecklist({ id: selectedId, name: title, items: next })
        } else {
          setCustomChecklists((list) =>
            list.map((c) => (c.id === selectedId ? { ...c, items: next } : c))
          )
        }
      }
      return next
    })
    setNewHeaderText("")
  }, [newHeaderText, selectedId, isBuiltIn, setCustomChecklists, onSaveChecklist, title])

  const saveTitle = useCallback(() => {
    const name = editedTitle.trim() || title
    if (!isBuiltIn && (name !== (custom?.name ?? title))) {
      if (onSaveChecklist) {
        onSaveChecklist({ id: selectedId, name, items })
      } else {
        setCustomChecklists((prev) =>
          prev.map((c) => (c.id === selectedId ? { ...c, name } : c))
        )
      }
    }
    setEditedTitle("")
    setIsEditingTitle(false)
  }, [custom, editedTitle, title, selectedId, isBuiltIn, setCustomChecklists, onSaveChecklist, items])

  const removeItemAt = useCallback(
    (index: number) => {
      const taskId = items[index]?.type === "task" ? items[index].id : undefined
      setItems((prev) => {
        const next = prev.filter((_, i) => i !== index)
        if (!isBuiltIn) {
          if (onSaveChecklist) {
            onSaveChecklist({ id: selectedId, name: title, items: next })
          } else {
            setCustomChecklists((list) =>
              list.map((c) => (c.id === selectedId ? { ...c, items: next } : c))
            )
          }
        }
        return next
      })
      if (taskId) {
        const prevSet = getCompletedSet(selectedId)
        const nextSet = new Set(prevSet)
        nextSet.delete(taskId)
        setCompletedFor(selectedId, nextSet)
      }
    },
    [items, selectedId, isBuiltIn, setCustomChecklists, setCompletedFor, getCompletedSet, onSaveChecklist, title]
  )

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 mb-1 w-fit gap-1.5 text-[var(--aw-text-muted)]"
              onClick={goBack}
            >
              <ArrowLeft className="size-4" />
              Voltar
            </Button>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                {canEditTitle && isEditingTitle ? (
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveTitle()
                      if (e.key === "Escape") {
                        setEditedTitle("")
                        setIsEditingTitle(false)
                      }
                    }}
                    placeholder="Nome do checklist"
                    className="text-xl font-semibold"
                    autoFocus
                  />
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <CardTitle
                      className={cn("text-xl", canEditTitle && "cursor-pointer hover:text-[var(--aw-accent)]")}
                      onClick={() => {
                        if (canEditTitle) {
                          setEditedTitle(custom?.name ?? title)
                          setIsEditingTitle(true)
                        }
                      }}
                    >
                      <span className="flex items-center gap-2">
                        {title}
                        {canEditTitle && <Pencil className="size-4 opacity-60" />}
                      </span>
                    </CardTitle>
                    {onDeleteChecklist && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-[var(--aw-text-muted)] hover:text-[var(--aw-danger)]"
                        title="Apagar checklist"
                        onClick={() => {
                          if (window.confirm("Apagar este checklist? Esta ação não pode ser desfeita.")) {
                            onDeleteChecklist()
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {((isBuiltIn && selectedId === "infra") || canEditItems) && (
                <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2.5">
                  <Input
                    placeholder="Título de tópico"
                    value={newHeaderText}
                    onChange={(e) => setNewHeaderText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addHeader()}
                    className="min-w-0 sm:min-w-[200px]"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addHeader} className="w-[7rem] shrink-0">
                    + Título
                  </Button>
                  <Input
                    placeholder="Adicionar tarefa…"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                    className="min-w-0 sm:min-w-[200px]"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTask} className="w-[7rem] shrink-0">
                    + Inserir
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-[var(--aw-text-muted)]">
                <span>
                  {doneCount}/{totalTasks} tarefas
                </span>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--aw-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--aw-accent)] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span>{pct}%</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-1">
              {items.map((item, index) => {
                if (item.type === "header") {
                  const itemKey = item.id ?? `h-${index}-${item.text}`
                  return (
                    <li
                      key={itemKey}
                      className="group flex items-center gap-2 pt-3 text-sm font-semibold text-[var(--aw-text)] first:pt-0"
                    >
                      <span className="min-w-0 flex-1">{item.text}</span>
                      {canEditItems && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-[var(--aw-text-muted)] hover:text-[var(--aw-danger)]"
                          title="Apagar tópico"
                          onClick={() => removeItemAt(index)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </li>
                  )
                }
                const id = item.id ?? `task-${index}`
                const checked = currentCompleted.has(id)
                return (
                  <li
                    key={id}
                    className={cn(
                      "group flex items-center gap-2 rounded-md py-1.5 pl-1",
                      checked && "text-[var(--aw-text-muted)]"
                    )}
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={() => toggle(id)}
                    />
                    <label
                      htmlFor={id}
                      className={cn(
                        "min-w-0 flex-1 cursor-pointer text-sm",
                        checked && "line-through"
                      )}
                    >
                      {item.text}
                    </label>
                    {canEditItems && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-[var(--aw-text-muted)] hover:text-[var(--aw-danger)]"
                        title="Apagar tarefa"
                        onClick={() => removeItemAt(index)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
