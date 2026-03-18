import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { type CustomChecklist } from "./notepadData"
import { apiGetChecklists, apiPutChecklist, apiDeleteChecklist } from "@/lib/api"
import { apiGetNotepadCompleted, apiPutNotepadCompleted } from "@/lib/api"
import { getInitialCompletedMap, NotepadChecklistView } from "@/pages/Notepad"

export function NotepadChecklistDetailPage() {
  const { checklistId } = useParams<{ checklistId: string }>()
  const navigate = useNavigate()
  const [customChecklists, setCustomChecklists] = useState<CustomChecklist[]>([])
  const [completedMap, setCompletedMap] = useState<Record<string, string[]>>(getInitialCompletedMap())
  const [newTask, setNewTask] = useState("")

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
      .then((data) => {
        if (cancelled) return
        const fromApi = data as CustomChecklist[]
        setCustomChecklists((prev) => {
          const current = checklistId ? prev.find((c) => c.id === checklistId) : null
          if (current && !fromApi.some((c) => c.id === checklistId)) {
            return [...fromApi, current]
          }
          return fromApi
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [checklistId])

  const goBack = useCallback(() => navigate("/checklists"), [navigate])
  const getCompletedSet = useCallback(
    (id: string) => new Set(completedMap[id] ?? []),
    [completedMap]
  )
  const setCompletedFor = useCallback((id: string, ids: Set<string>) => {
    setCompletedMap((prev) => {
      const next = { ...prev, [id]: [...ids] }
      apiPutNotepadCompleted(next).catch(() => {})
      return next
    })
  }, [])

  const onDeleteChecklist = useCallback(async () => {
    if (!checklistId || checklistId === "infra" || checklistId === "fluxo") return
    try {
      await apiDeleteChecklist(checklistId)
      setCustomChecklists((prev) => prev.filter((c) => c.id !== checklistId))
      goBack()
    } catch {}
  }, [checklistId, goBack])

  if (!checklistId) {
    goBack()
    return null
  }

  const setCustomChecklistsWithApi = useCallback(
    (action: React.SetStateAction<CustomChecklist[]>) => {
      setCustomChecklists((prev) => {
        const next = typeof action === "function" ? action(prev) : action
        const updated = checklistId ? next.find((c) => c.id === checklistId) : null
        if (updated) apiPutChecklist(updated.id, { name: updated.name, items: updated.items }).catch(() => {})
        return next
      })
    },
    [checklistId]
  )

  /** Guarda o checklist atual na lista e na API. Usado quando a lista pode estar vazia (fetch atrasado). */
  const saveChecklist = useCallback(
    (checklist: CustomChecklist) => {
      setCustomChecklists((prev) => {
        const next = prev.some((c) => c.id === checklist.id)
          ? prev.map((c) => (c.id === checklist.id ? checklist : c))
          : [...prev, checklist]
        apiPutChecklist(checklist.id, { name: checklist.name, items: checklist.items }).catch(() => {})
        return next
      })
    },
    []
  )

  return (
    <NotepadChecklistView
      selectedId={checklistId}
      customChecklists={customChecklists}
      setCustomChecklists={setCustomChecklistsWithApi}
      onSaveChecklist={saveChecklist}
      completedMap={completedMap}
      setCompletedFor={setCompletedFor}
      getCompletedSet={getCompletedSet}
      goBack={goBack}
      newTask={newTask}
      setNewTask={setNewTask}
      onDeleteChecklist={checklistId !== "infra" && checklistId !== "fluxo" ? onDeleteChecklist : undefined}
    />
  )
}
