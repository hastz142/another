import { useState, useCallback, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trash2, Save, Check, History, Sparkles, Maximize2, HelpCircle } from "lucide-react"
import { apiGetNota, apiPutNota, apiDeleteNota } from "@/lib/api"
import { ImagePreviewModal } from "./ImagePreviewModal"
import { NotaEditor } from "./NotaEditor"
import { NotaPreview } from "./NotaPreview"
import { useZenMode } from "@/contexts/ZenModeContext"
import { cn } from "@/lib/utils"

const MAX_CONTENT_HISTORY = 5

const EDICAO_ATALHOS = [
  { keys: "Ctrl+S", desc: "Salvar alterações" },
  { keys: "/", desc: "Menu de comandos (títulos, negrito, listas, alinhamento…)" },
  { keys: "Ctrl+B", desc: "Negrito" },
  { keys: "Ctrl+I", desc: "Itálico" },
  { keys: "Ctrl+U", desc: "Sublinhado" },
  { keys: "Ctrl+\\", desc: "Modo foco (esconder sidebar)" },
]

export function NotepadNotaDetailPage() {
  const { notaId } = useParams<{ notaId: string }>()
  const navigate = useNavigate()
  const { zenMode, toggleZenMode } = useZenMode()
  const [nota, setNota] = useState<Awaited<ReturnType<typeof apiGetNota>> | null>(null)
  const [loading, setLoading] = useState(!!notaId)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [content, setContent] = useState("")
  const [contentHistory, setContentHistory] = useState<string[]>([])
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "unsaved">("idle")
  const [showEdicaoAtalhos, setShowEdicaoAtalhos] = useState(false)

  useEffect(() => {
    if (!notaId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    apiGetNota(notaId)
      .then((data) => {
        if (cancelled) return
        setNota(data)
        setTitle(data.title ?? "")
        setCategory((data.tags && data.tags[0]) ?? "")
        setContent(data.content ?? "")
      })
      .catch(() => { if (!cancelled) setNota(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [notaId])

  useEffect(() => {
    if (nota) {
      setTitle(nota.title)
      setCategory((nota.tags && nota.tags[0]) ?? "")
      setContent(nota.content)
    }
  }, [nota?.id])

  const handleSave = useCallback(async () => {
    if (!notaId) return
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setTitle(nota?.title ?? "Nova nota")
      return
    }
    try {
      await apiPutNota(notaId, {
        title: trimmedTitle,
        content,
        tags: category.trim() ? [category.trim()] : [],
      })
      setSaveStatus("saved")
      const t = setTimeout(() => setSaveStatus("idle"), 2500)
      return () => clearTimeout(t)
    } catch {}
  }, [notaId, title, content, category, nota?.title])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleSave])

  useEffect(() => {
    return () => {
      if (notaId && title.trim()) {
        apiPutNota(notaId, {
          title: title.trim(),
          content,
          tags: category.trim() ? [category.trim()] : [],
        }).catch(() => {})
      }
    }
  }, [notaId, title, content, category])

  const handleDelete = useCallback(async () => {
    if (!notaId) return
    if (!window.confirm("Apagar esta nota? Esta ação não pode ser desfeita.")) return
    try {
      await apiDeleteNota(notaId)
      navigate("/notas")
    } catch {}
  }, [notaId, navigate])

  const handleContentChange = useCallback((html: string) => {
    setContent(html)
    setSaveStatus("unsaved")
  }, [])

  const handleAiRequest = useCallback(() => {
    setContentHistory((prev) => {
      const next = [content, ...prev].slice(0, MAX_CONTENT_HISTORY)
      return next
    })
    setSaveStatus("unsaved")
    // Placeholder: quando houver API de IA, substituir content pela sugestão aqui
    alert("Sugestão de IA em breve. Use «Ver anterior» para restaurar uma versão se precisar.")
  }, [content])

  const handleRestorePrevious = useCallback(() => {
    setContentHistory((prev) => {
      if (prev.length === 0) return prev
      const [restored, ...rest] = prev
      setContent(restored)
      setSaveStatus("unsaved")
      return rest
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "\\" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        toggleZenMode()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggleZenMode])

  const openImagePreview = useCallback((url: string) => {
    setPreviewImageUrl(url)
    setImageModalOpen(true)
  }, [])

  const closeImagePreview = useCallback(() => {
    setImageModalOpen(false)
    setPreviewImageUrl(null)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-[var(--aw-text-muted)]">
        Carregando…
      </div>
    )
  }
  if (!notaId || !nota) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[var(--aw-text-muted)]">Nota não encontrada.</p>
          <Button variant="link" className="mt-2 p-0" onClick={() => navigate("/notas")}>
            Voltar à lista
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header: voltar + título + indicador de save + apagar */}
      <header className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--aw-border)] bg-[var(--aw-bg)]/95 px-4 py-3 backdrop-blur-sm">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-1 gap-1.5 text-[var(--aw-text-muted)]"
          onClick={() => navigate("/notas")}
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
        <div className="min-w-0 flex-1 space-y-1">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setSaveStatus("unsaved")
            }}
            onBlur={handleSave}
            placeholder="Título da nota (obrigatório)"
            className="max-w-xl border-0 bg-transparent text-lg font-semibold shadow-none focus-visible:ring-0"
          />
          <Input
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setSaveStatus("unsaved")
            }}
            onBlur={handleSave}
            placeholder="Categoria (opcional)"
            className="max-w-xs border-0 bg-transparent text-sm text-[var(--aw-text-muted)] shadow-none focus-visible:ring-0 placeholder:text-[var(--aw-text-muted)]/70"
          />
        </div>
        {saveStatus === "saved" && (
          <span className="flex items-center gap-1.5 text-xs text-[var(--aw-positive)]">
            <Check className="size-3.5" />
            Alterações salvas
          </span>
        )}
        {saveStatus === "unsaved" && (
          <span className="text-xs text-[var(--aw-text-muted)]">Não guardado</span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-[var(--aw-text-muted)] hover:text-[var(--aw-accent)]"
          title="Sugestão de IA para o texto (ou use /ai no editor)"
          onClick={handleAiRequest}
        >
          <Sparkles className="size-4" />
          Melhorar com IA
        </Button>
        {contentHistory.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-[var(--aw-text-muted)] hover:text-[var(--aw-text)]"
            title="Restaurar versão anterior (ex.: antes da sugestão de IA)"
            onClick={handleRestorePrevious}
          >
            <History className="size-4" />
            Ver anterior
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-[var(--aw-text-muted)] hover:text-[var(--aw-accent)]"
          title={zenMode ? "Sair do modo foco (Ctrl+\\)" : "Modo foco / tela cheia (Ctrl+\\)"}
          onClick={toggleZenMode}
        >
          <Maximize2 className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-[var(--aw-text-muted)] hover:text-[var(--aw-danger)]"
          title="Apagar nota"
          onClick={handleDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </header>

      {/* Split: Editor (esquerda) + Preview (direita) */}
      <div className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-2">
        <div className="flex flex-col border-r-0 border-[var(--aw-border)] p-4 lg:border-r">
          <div className="relative mb-2 flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--aw-text-muted)]">
              Edição
            </p>
            <button
              type="button"
              onClick={() => setShowEdicaoAtalhos((v) => !v)}
              className={cn(
                "rounded p-0.5 text-[var(--aw-text-muted)] transition-colors hover:text-[var(--aw-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--aw-accent)] focus:ring-offset-2 focus:ring-offset-[var(--aw-bg)]",
                showEdicaoAtalhos && "bg-[var(--aw-accent)]/15 text-[var(--aw-accent)]"
              )}
              aria-label="Atalhos de teclado"
              aria-expanded={showEdicaoAtalhos}
            >
              <HelpCircle className="size-4" />
            </button>
            {showEdicaoAtalhos && (
              <>
                <div
                  className="absolute left-0 top-full z-20 mt-1.5 w-72 rounded-lg border border-[var(--aw-border)] bg-[var(--aw-card)] p-3 shadow-lg"
                  role="tooltip"
                >
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--aw-text-muted)]">
                    Atalhos no texto
                  </p>
                  <ul className="space-y-1.5 text-sm text-[var(--aw-text)]">
                    {EDICAO_ATALHOS.map(({ keys, desc }) => (
                      <li key={keys} className="flex justify-between gap-3">
                        <kbd className="shrink-0 rounded border border-[var(--aw-border)] bg-[var(--aw-bg)] px-1.5 py-0.5 font-mono text-xs">
                          {keys}
                        </kbd>
                        <span className="text-right text-[var(--aw-text-muted)]">{desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setShowEdicaoAtalhos(false)}
                />
              </>
            )}
          </div>
          <NotaEditor
            key={notaId}
            content={content}
            onChange={handleContentChange}
            onAiRequest={handleAiRequest}
            placeholder="Escreve aqui… Digite / para comandos. Links de imagem abrem em pop-up ao clicar."
          />
        </div>
        <div className="flex flex-col overflow-hidden bg-[var(--aw-bg)]/50 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--aw-text-muted)]">
            Pré-visualização
          </p>
          <div className="min-h-[280px] overflow-auto rounded-md border border-[var(--aw-border)] bg-[var(--aw-card)] p-4">
            <NotaPreview html={content} onImageLinkClick={openImagePreview} />
          </div>
        </div>
      </div>

      {/* Rodapé: botão Salvar fixo (glassmorphism) */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 flex justify-end p-4">
        <div className="pointer-events-auto rounded-xl border border-[var(--aw-border)] bg-[var(--aw-card)]/80 shadow-lg backdrop-blur-md">
          <Button
            type="button"
            onClick={handleSave}
            className="gap-2 bg-[var(--aw-accent)] hover:bg-[var(--aw-accent)]/90"
          >
            <Save className="size-4" />
            Salvar alterações
            <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium">
              Ctrl+S
            </span>
          </Button>
        </div>
      </div>

      {/* Espaço no final para não tapar conteúdo com o botão */}
      <div className="h-20 shrink-0" />

      <ImagePreviewModal
        imageUrl={previewImageUrl}
        open={imageModalOpen}
        onClose={closeImagePreview}
      />
    </div>
  )
}
