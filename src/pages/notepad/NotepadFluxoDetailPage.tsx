import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronDown, Lock, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { MESA_CATEGORIES } from "@/pages/mesa-investigacao/types"
import { apiGetFluxos } from "@/lib/api"
import {
  deriveMesaContent,
  type MesaContent,
  type FluxoItem,
  type MesaImageItem,
} from "./notepadData"

export function NotepadFluxoDetailPage() {
  const { flowId } = useParams<{ flowId: string }>()
  const navigate = useNavigate()
  const [flow, setFlow] = useState<FluxoItem | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [proximoPassoExpanded, setProximoPassoExpanded] = useState(true)
  const [mesaCategoryFilter, setMesaCategoryFilter] = useState<string | null>(null)
  const [mesaContent, setMesaContent] = useState<MesaContent | null>(null)

  useEffect(() => {
    if (!flowId) return
    let cancelled = false
    apiGetFluxos()
      .then((fluxos) => {
        if (cancelled) return
        const f = fluxos.find((x) => x.id === flowId)
        if (f) {
          const flowItem: FluxoItem = {
            id: f.id,
            name: f.name,
            nodes: f.nodes as FluxoItem["nodes"],
            edges: f.edges as FluxoItem["edges"],
          }
          setFlow(flowItem)
          const content = deriveMesaContent(flowItem.nodes, flowItem.edges)
          setMesaContent(content)
          setSelectedSectionId(content.flowOrder[0] ?? null)
        } else {
          setFlow(null)
        }
      })
      .catch(() => { if (!cancelled) setFlow(null) })
    return () => { cancelled = true }
  }, [flowId])

  if (!flowId || !flow) {
    navigate("/fluxos")
    return null
  }

  const flowName = flow.name

  if (!mesaContent) return null

  const imageById = new Map(mesaContent.images.map((img) => [img.id, img]))
  const commentById = new Map(mesaContent.comments.map((c) => [c.id, c]))
  const orderedIds =
    mesaContent.flowOrder.length > 0
      ? mesaContent.flowOrder
      : mesaContent.images.map((i) => i.id)
  const filteredOrderedIds =
    mesaCategoryFilter == null
      ? orderedIds
      : orderedIds.filter((id) => imageById.get(id)?.categoryId === mesaCategoryFilter)
  const selectedSection = selectedSectionId ? imageById.get(selectedSectionId) : null
  const linkedComments = selectedSection
    ? selectedSection.connectedCommentIds.map((cid) => commentById.get(cid)).filter(Boolean) as { id: string; text: string }[]
    : []

  return (
    <div className="min-h-screen p-6">
      <div className={cn("mx-auto w-full", mesaContent.images.length > 0 ? "max-w-6xl" : "max-w-3xl")}>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--aw-text)]">
            Fluxo: {flowName}
          </h1>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate("/fluxos")}
          >
            Voltar aos fluxos
          </Button>
        </div>

        {mesaContent.images.length === 0 && mesaContent.comments.length === 0 ? (
          <Card className="overflow-hidden border-2 border-[var(--aw-border)]">
            <CardContent className="py-8">
              <p className="text-center text-sm text-[var(--aw-text-muted)]">
                Nenhuma imagem ou comentário neste fluxo. Use a Mesa de Investigação para criar o fluxo e depois associá-lo aqui.
              </p>
              <div className="mt-4 flex justify-center">
                <Button asChild variant="outline" size="sm">
                  <Link to="/mesa-de-investigacao">Abrir Mesa de Investigação</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {mesaContent.images.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--aw-text-muted)]">Filtrar:</span>
                <Button
                  type="button"
                  variant={mesaCategoryFilter === null ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setMesaCategoryFilter(null)}
                >
                  Todos
                </Button>
                {MESA_CATEGORIES.map((cat) => (
                  <Button
                    key={cat.id}
                    type="button"
                    variant={mesaCategoryFilter === cat.id ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs"
                    style={mesaCategoryFilter !== cat.id ? { borderColor: cat.color } : undefined}
                    onClick={() => setMesaCategoryFilter(cat.id)}
                  >
                    <span className="mr-1.5 size-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.label}
                  </Button>
                ))}
              </div>
            )}

            {mesaContent.images.length === 0 ? (
              <ul className="space-y-2">
                {mesaContent.comments.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-md border border-[var(--aw-border)] bg-[var(--aw-card)] px-3 py-2 text-sm"
                  >
                    {c.text || <span className="italic text-[var(--aw-text-muted)]">(vazio)</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mesa-flow__grid">
                <div className="mesa-flow__sections">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--aw-text-muted)]">
                    Seções
                  </p>
                  <ul className="space-y-2">
                    {filteredOrderedIds.map((id, index) => {
                      const img = imageById.get(id)
                      if (!img) return null
                      const isSelected = selectedSectionId === id
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => setSelectedSectionId(id)}
                            className={cn(
                              "mesa-flow__section-card w-full rounded-lg border-2 bg-[var(--aw-card)] p-2 text-left transition",
                              isSelected
                                ? "border-[var(--aw-accent)] shadow-md"
                                : "border-[var(--aw-border)] hover:border-[var(--aw-accent)]/50"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <img src={img.dataUrl} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                              <div className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-medium text-[var(--aw-text)]">
                                  {img.fileName || `Seção ${index + 1}`}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-[var(--aw-text-muted)]">
                                  {img.prevImageIds.length > 0 ? (
                                    <>
                                      <Lock className="size-2.5" />
                                      Desbloqueada por {img.prevImageIds.length} seção(ões)
                                    </>
                                  ) : (
                                    "Entrada do fluxo"
                                  )}
                                </span>
                              </div>
                              {img.edgeCount === 0 && (
                                <span title="Evidência solta">
                                  <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
                                </span>
                              )}
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <div className="mesa-flow__detail">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--aw-text-muted)]">
                    Detalhe
                  </p>
                  {selectedSection ? (
                    <div className="space-y-4 rounded-lg border border-[var(--aw-border)] bg-[var(--aw-card)] p-4">
                      <div className="overflow-hidden rounded-lg border border-[var(--aw-border)]">
                        <img
                          src={selectedSection.dataUrl}
                          alt=""
                          className="h-auto w-full max-h-[280px] object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--aw-text)]">
                          {selectedSection.fileName || selectedSection.id}
                        </p>
                        {selectedSection.prevImageIds.length > 0 && (
                          <p className="mt-1 text-xs text-[var(--aw-text-muted)]">
                            Desbloqueado por:{" "}
                            {selectedSection.prevImageIds
                              .map((pid) => imageById.get(pid))
                              .filter(Boolean)
                              .map((prev: MesaImageItem | undefined, i: number) => (
                                <span key={prev!.id}>
                                  {i > 0 && ", "}
                                  <button
                                    type="button"
                                    className="text-[var(--aw-accent)] hover:underline"
                                    onClick={() => setSelectedSectionId(prev!.id)}
                                  >
                                    {prev!.fileName || prev!.id}
                                  </button>
                                </span>
                              ))}
                          </p>
                        )}
                      </div>
                      {selectedSection.nextImageIds.length > 0 && (
                        <div className="rounded-md border border-[var(--aw-accent)]/30 bg-[var(--aw-accent)]/5 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setProximoPassoExpanded((e) => !e)}
                            className="flex w-full items-center gap-1.5 p-3 text-left text-xs font-semibold text-[var(--aw-accent)] hover:bg-[var(--aw-accent)]/10 transition-colors"
                            aria-expanded={proximoPassoExpanded}
                          >
                            {proximoPassoExpanded ? (
                              <ChevronDown className="size-4 shrink-0" />
                            ) : (
                              <ChevronRight className="size-4 shrink-0" />
                            )}
                            Próximo passo
                          </button>
                          {proximoPassoExpanded && (
                            <ul className="space-y-1.5 border-t border-[var(--aw-accent)]/20 p-3 pt-2">
                              {selectedSection.nextImageIds.map((nextId) => {
                                const next = imageById.get(nextId)
                                if (!next) return null
                                return (
                                  <li key={nextId}>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedSectionId(nextId)}
                                      className="flex w-full items-center gap-2 rounded border border-[var(--aw-border)] bg-[var(--aw-bg)] p-2 text-left text-sm transition hover:border-[var(--aw-accent)]"
                                    >
                                      <img src={next.dataUrl} alt="" className="h-10 w-10 rounded object-cover" />
                                      <span className="truncate text-[var(--aw-text)]">{next.fileName || next.id}</span>
                                      <ChevronRight className="ml-auto size-4 text-[var(--aw-text-muted)]" />
                                    </button>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-[var(--aw-border)] bg-[var(--aw-card)]/50">
                      <p className="text-sm text-[var(--aw-text-muted)]">Selecione uma seção à esquerda.</p>
                    </div>
                  )}
                </div>

                <div className="mesa-flow__comments">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--aw-text-muted)]">
                    Comentários
                  </p>
                  <div className="rounded-lg border border-[var(--aw-border)] bg-[var(--aw-card)] p-3">
                    {selectedSection ? (
                      linkedComments.length > 0 ? (
                        <ul className="space-y-2">
                          {linkedComments.map((c) => (
                            <li
                              key={c.id}
                              className="rounded-md border border-[var(--aw-border)]/50 bg-[var(--aw-bg)] px-3 py-2 text-sm text-[var(--aw-text)]"
                            >
                              {c.text || <span className="italic text-[var(--aw-text-muted)]">(vazio)</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-[var(--aw-text-muted)]">Nenhum comentário ligado a esta seção.</p>
                      )
                    ) : (
                      <p className="text-xs text-[var(--aw-text-muted)]">Selecione uma seção para ver comentários.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
