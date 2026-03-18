import { useState, useCallback, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, ListChecks } from "lucide-react"
import { cn } from "@/lib/utils"
import { getProgress, getInitialCompletedMap } from "@/pages/Notepad"
import { apiGetChecklists, apiPostChecklist } from "@/lib/api"
import { apiGetNotepadCompleted } from "@/lib/api"
import { type CustomChecklist } from "./notepadData"

export function NotepadChecklistsPage() {
  const navigate = useNavigate()
  const [customChecklists, setCustomChecklists] = useState<CustomChecklist[]>([])
  const [completedMap, setCompletedMap] = useState<Record<string, string[]>>(getInitialCompletedMap())

  useEffect(() => {
    let cancelled = false
    apiGetNotepadCompleted()
      .then((data) => { if (!cancelled) setCompletedMap(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    let cancelled = false
    apiGetChecklists()
      .then((data) => { if (!cancelled) setCustomChecklists(data as CustomChecklist[]) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const getCompletedSet = useCallback(
    (id: string) => new Set(completedMap[id] ?? []),
    [completedMap]
  )

  const createNewChecklist = useCallback(async () => {
    try {
      const created = await apiPostChecklist({ name: "Novo checklist", items: [] })
      setCustomChecklists((prev) => [...prev, created as CustomChecklist])
      navigate(`/checklists/${created.id}`)
    } catch {}
  }, [navigate])

  const allChecklists = customChecklists.map((c) => ({ id: c.id, name: c.name, items: c.items }))

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-xl font-semibold text-[var(--aw-text)]">Checklists</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {allChecklists.map(({ id, name, items }) => {
            const completed = getCompletedSet(id)
            const { done, total, pct } = getProgress(items, completed)
            return (
              <Link key={id} to={`/checklists/${id}`}>
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--aw-border)] text-[var(--aw-text-muted)]">
                        <ListChecks className="size-4" />
                      </div>
                      <CardTitle className="text-base">{name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm text-[var(--aw-text-muted)]">
                      <span>
                        {done}/{total} tarefas
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--aw-border)]">
                        <div
                          className="h-full rounded-full bg-[var(--aw-accent)] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8">{pct}%</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}

          <Card
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center border-dashed border-[var(--aw-border)] py-10 transition-colors",
              "hover:border-[var(--aw-accent)]/50 hover:bg-[var(--aw-border)]/30"
            )}
            onClick={createNewChecklist}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--aw-card)] text-[var(--aw-text-muted)] shadow-sm">
              <Plus className="size-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-[var(--aw-text)]">+ Novo Checklist</p>
            <p className="mt-0.5 text-xs text-[var(--aw-text-muted)]">Começar do zero</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
