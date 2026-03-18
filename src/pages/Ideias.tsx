import { useState, useCallback, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { apiGetIdeias, apiPostIdeia, apiPutIdeia, apiDeleteIdeia, type IdeiaItemApi } from "@/lib/api"
import { Plus, Trash2, Pencil, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function Ideias() {
  const [items, setItems] = useState<IdeiaItemApi[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [formText, setFormText] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  useEffect(() => {
    let cancelled = false
    apiGetIdeias()
      .then((data) => { if (!cancelled) setItems(data) })
      .catch(() => { if (!cancelled) setItems([]) })
    return () => { cancelled = true }
  }, [])

  const filtered = items.filter((item) => {
    const q = searchQuery.trim().toLowerCase()
    return !q || item.text.toLowerCase().includes(q)
  })

  const handleAdd = useCallback(async () => {
    const text = formText.trim()
    if (!text) return
    try {
      const saved = await apiPostIdeia({ text, createdAt: Date.now() })
      setItems((prev) => [saved, ...prev])
    } catch {
      // mantém estado atual em caso de erro
    }
    setFormOpen(false)
    setFormText("")
  }, [formText])

  const startEdit = useCallback((item: IdeiaItemApi) => {
    setEditingId(item.id)
    setEditText(item.text)
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingId || !editText.trim()) {
      setEditingId(null)
      setEditText("")
      return
    }
    try {
      const updated = await apiPutIdeia(editingId, { text: editText.trim() })
      setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)))
    } catch {
      // mantém estado atual
    }
    setEditingId(null)
    setEditText("")
  }, [editingId, editText])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditText("")
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Apagar esta ideia?")) return
    try {
      await apiDeleteIdeia(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      // mantém estado atual
    }
  }, [])

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-semibold text-[var(--aw-text)]">
          <Lightbulb className="size-6 text-[var(--aw-accent)]" />
          Ideias
        </h1>
        <p className="mb-6 text-sm text-[var(--aw-text-muted)]">
          Anote ideias rápidas para o projeto. Tudo fica salvo no banco de dados.
        </p>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Pesquisar ideias…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {formOpen ? (
          <Card className="mb-6">
            <CardContent className="pt-4">
              <textarea
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="O que você está pensando?"
                className="mb-3 min-h-[80px] w-full resize-y rounded-lg border border-[var(--aw-border)] bg-[var(--aw-bg)] px-3 py-2 text-sm text-[var(--aw-text)] placeholder:text-[var(--aw-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--aw-accent)]"
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="button" onClick={handleAdd} disabled={!formText.trim()}>
                  Guardar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setFormOpen(false); setFormText("") }}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormOpen(true)}
            className="mb-6 gap-2"
          >
            <Plus className="size-4" />
            Nova ideia
          </Button>
        )}

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-[var(--aw-text-muted)]">
              {items.length === 0
                ? "Nenhuma ideia ainda. Adicione a primeira acima."
                : "Nenhuma ideia corresponde à pesquisa."}
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {filtered.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {editingId === item.id ? (
                          <>
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="mb-2 min-h-[60px] w-full resize-y rounded-lg border border-[var(--aw-border)] bg-[var(--aw-bg)] px-3 py-2 text-sm text-[var(--aw-text)] focus:outline-none focus:ring-2 focus:ring-[var(--aw-accent)]"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button type="button" size="sm" onClick={saveEdit}>
                                Salvar
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>
                                Cancelar
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className={cn("whitespace-pre-wrap text-sm text-[var(--aw-text)]")}>
                              {item.text}
                            </p>
                            <p className="mt-1.5 text-xs text-[var(--aw-text-muted)]">
                              {formatDate(item.createdAt)}
                            </p>
                          </>
                        )}
                      </div>
                      {editingId !== item.id && (
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Editar"
                            onClick={() => startEdit(item)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[var(--aw-text-muted)] hover:text-[var(--aw-danger)]"
                            title="Apagar"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
