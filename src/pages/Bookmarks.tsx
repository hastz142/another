import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { normalizeBookmarkUrl } from "@/lib/bookmarksData"
import {
  apiGetBookmarks,
  apiPostBookmark,
  apiPutBookmark,
  apiDeleteBookmark,
  type BookmarkItemApi,
} from "@/lib/api"
import { Plus, ExternalLink, Copy, Trash2, Tag, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

function getAllTags(items: BookmarkItemApi[]): string[] {
  const set = new Set<string>()
  items.forEach((b) => (b.tags ?? []).forEach((t) => set.add(t)))
  return [...set].sort((a, b) => a.localeCompare(b))
}

export function Bookmarks() {
  const [items, setItems] = useState<BookmarkItemApi[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiGetBookmarks()
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])
  const [tagFilter, setTagFilter] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formUrl, setFormUrl] = useState("")
  const [formTitle, setFormTitle] = useState("")
  const [formTags, setFormTags] = useState("")
  const [formSource, setFormSource] = useState("")
  const [formNote, setFormNote] = useState("")

  const tags = getAllTags(items)
  const filtered = items.filter((item) => {
    const matchTag = !tagFilter || item.tags.includes(tagFilter)
    const q = searchQuery.trim().toLowerCase()
    const matchSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.url.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      (item.note && item.note.toLowerCase().includes(q)) ||
      item.tags.some((t) => t.includes(q))
    return matchTag && matchSearch
  })

  const handleAdd = useCallback(async () => {
    const url = formUrl.trim()
    const title = formTitle.trim()
    if (!url && !title) return
    const newItem = {
      id: `bm-${Date.now()}`,
      url,
      title: title || url,
      tags: formTags.split(/[\s,;]+/).map((t) => t.trim().toLowerCase()).filter(Boolean),
      source: formSource,
      note: formNote,
      createdAt: Date.now(),
    }
    try {
      const saved = await apiPostBookmark(newItem)
      setItems((prev) => [saved, ...prev])
    } catch {
      // mantém estado atual
    }
    setFormOpen(false)
    setEditingId(null)
    setFormUrl("")
    setFormTitle("")
    setFormTags("")
    setFormSource("")
    setFormNote("")
  }, [formUrl, formTitle, formTags, formSource, formNote])

  const handleUpdate = useCallback(async () => {
    const url = formUrl.trim()
    const title = formTitle.trim()
    if ((!url && !title) || !editingId) return
    const patch = {
      url,
      title: title || url,
      tags: formTags.split(/[\s,;]+/).map((t) => t.trim().toLowerCase()).filter(Boolean),
      source: formSource,
      note: formNote,
    }
    try {
      const updated = await apiPutBookmark(editingId, patch)
      setItems((prev) => prev.map((b) => (b.id === editingId ? updated : b)))
    } catch {
      // mantém estado atual
    }
    setFormOpen(false)
    setEditingId(null)
    setFormUrl("")
    setFormTitle("")
    setFormTags("")
    setFormSource("")
    setFormNote("")
  }, [editingId, formUrl, formTitle, formTags, formSource, formNote])

  const openEditForm = useCallback((item: BookmarkItemApi) => {
    setEditingId(item.id)
    setFormUrl(item.url)
    setFormTitle(item.title)
    setFormTags(item.tags.join(", "))
    setFormSource(item.source)
    setFormNote(item.note ?? "")
    setFormOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setFormOpen(false)
    setEditingId(null)
    setFormUrl("")
    setFormTitle("")
    setFormTags("")
    setFormSource("")
    setFormNote("")
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Apagar este bookmark?")) return
    try {
      await apiDeleteBookmark(id)
      setItems((prev) => prev.filter((b) => b.id !== id))
    } catch {
      // mantém estado atual
    }
  }, [])

  const copyUrl = useCallback(async (url: string) => {
    await navigator.clipboard.writeText(url)
  }, [])

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-2xl font-semibold text-[var(--aw-text)]">Bookmarks</h1>
        <p className="mb-6 text-sm text-[var(--aw-text-muted)]">
          Links e referências por tags, título e fonte. Pode ser só título + nota (sem URL).
        </p>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Pesquisar por título, URL, tag, fonte ou nota…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setTagFilter("")}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                !tagFilter
                  ? "bg-[var(--aw-accent)]/20 text-[var(--aw-accent)]"
                  : "bg-[var(--aw-border)]/60 text-[var(--aw-text-muted)] hover:bg-[var(--aw-border)] hover:text-[var(--aw-text)]"
              )}
            >
              Todos
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTagFilter(tag)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  tagFilter === tag
                    ? "bg-[var(--aw-accent)]/20 text-[var(--aw-accent)]"
                    : "bg-[var(--aw-border)]/60 text-[var(--aw-text-muted)] hover:bg-[var(--aw-border)] hover:text-[var(--aw-text)]"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {formOpen ? (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {editingId ? "Editar bookmark" : "Novo bookmark"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--aw-text-muted)]">Título *</label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Nome, descrição ou fonte"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--aw-text-muted)]">URL</label>
                <Input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://... (opcional)"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--aw-text-muted)]">Nota / citação</label>
                <textarea
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Opcional"
                  className="min-h-[60px] w-full resize-y rounded-lg border border-[var(--aw-border)] bg-[var(--aw-bg)] px-3 py-2 text-sm text-[var(--aw-text)] placeholder:text-[var(--aw-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--aw-accent)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--aw-text-muted)]">Tags</label>
                <Input
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="ex: trabalho, docs, referência (separar por vírgula ou espaço)"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--aw-text-muted)]">Fonte</label>
                <Input
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  placeholder="ex: Twitter, newsletter, artigo"
                />
              </div>
              <div className="flex gap-2">
                {editingId ? (
                  <Button type="button" onClick={handleUpdate} disabled={!formTitle.trim() && !formUrl.trim()}>
                    Guardar alterações
                  </Button>
                ) : (
                  <Button type="button" onClick={handleAdd} disabled={!formTitle.trim() && !formUrl.trim()}>
                    Guardar
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={closeForm}>
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
            Adicionar bookmark
          </Button>
        )}

        {loading ? (
          <p className="py-4 text-center text-sm text-[var(--aw-text-muted)]">
            Carregando dados salvos…
          </p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-[var(--aw-text-muted)]">
              {items.length === 0
                ? "Ainda não há bookmarks. Adicione o primeiro acima."
                : "Nenhum bookmark corresponde ao filtro ou à pesquisa."}
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
                        {item.url.trim() ? (
                          <a
                            href={normalizeBookmarkUrl(item.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-[var(--aw-accent)] hover:underline"
                          >
                            {item.title || item.url}
                          </a>
                        ) : (
                          <span className="font-medium text-[var(--aw-text)]">{item.title || "Sem título"}</span>
                        )}
                        {item.url.trim() && (
                          <p className="mt-0.5 truncate font-mono text-xs text-[var(--aw-text-muted)]">
                            {item.url}
                          </p>
                        )}
                        {(item.note ?? "").trim() && (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--aw-text-muted)]">
                            {item.note}
                          </p>
                        )}
                        {item.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.tags.map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center gap-0.5 rounded bg-[var(--aw-border)]/80 px-1.5 py-0.5 text-[10px] text-[var(--aw-text-muted)]"
                              >
                                <Tag className="size-2.5" />
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.source && (
                          <p className="mt-1 text-xs text-[var(--aw-text-muted)]">Fonte: {item.source}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Editar"
                          onClick={() => openEditForm(item)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        {item.url.trim() && (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Abrir em nova aba"
                              onClick={() => window.open(normalizeBookmarkUrl(item.url), "_blank")}
                            >
                              <ExternalLink className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Copiar URL"
                              onClick={() => copyUrl(item.url)}
                            >
                              <Copy className="size-4" />
                            </Button>
                          </>
                        )}
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
