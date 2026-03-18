import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Viewport,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { ImagePlus, MessageSquarePlus, Trash2, Lock, Unlock, Undo2, Filter, AlertTriangle, CloudUpload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImageNode } from "./nodes/ImageNode"
import { CommentNode } from "./nodes/CommentNode"
import {
  getDefaultState,
  MESA_CATEGORIES,
  type MesaNode,
} from "./types"
import type { PersistedState } from "./types"
import { apiGetMesa, apiPutMesa } from "@/lib/api"
import type { ImageNodeData, CommentNodeData } from "./types"
import { buildMesaSessaoPayload } from "./mesaSessaoExport"
import { apiPostMesaSessao } from "@/lib/api"

const MAX_UNDO_HISTORY = 50

const NODE_TYPES = { image: ImageNode, comment: CommentNode }

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }

let nodeId = 0
function nextId() {
  return `mesa-${Date.now()}-${++nodeId}`
}

const TOAST_DURATION_MS = 3500

type ToastItem = { id: number; message: string }

/** Comentários ligados a uma imagem herdam o grupo dessa imagem (para filtro e fitView). */
function getCommentIdsConnectedToGroupImages(
  nodes: MesaNode[],
  edges: Edge[],
  categoryId: string
): Set<string> {
  const imageIdsInGroup = new Set(
    nodes
      .filter((n) => n.type === "image" && (n.data as ImageNodeData).categoryId === categoryId)
      .map((n) => n.id)
  )
  const commentIds = new Set(
    nodes.filter((n) => n.type === "comment").map((n) => n.id)
  )
  const connected = new Set<string>()
  for (const e of edges) {
    const srcIn = imageIdsInGroup.has(e.source)
    const tgtIn = imageIdsInGroup.has(e.target)
    if (srcIn && commentIds.has(e.target)) connected.add(e.target)
    if (tgtIn && commentIds.has(e.source)) connected.add(e.source)
  }
  return connected
}

type PanelProps = {
  setNodes: React.Dispatch<React.SetStateAction<MesaNode[]>>
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  setViewport: (v: Viewport) => void
  nodes: MesaNode[]
  edges: Edge[]
  lastMouseScreenRef: React.MutableRefObject<{ x: number; y: number }>
  lastInteractedImageNodeIdRef: React.MutableRefObject<string | null>
  addImageNodeRef: React.MutableRefObject<((dataUrl: string, fileName?: string) => void) | null>
  onToast: (message: string) => void
  onClearMesa: () => void
  saveForUndo: () => void
  onRevertLastEdge: () => void
  filterCategoryId: string | null
  onFilterCategoryId: (id: string | null) => void
  onExportFilterToDb?: (categoryId: string) => void
}

const FILTER_CLICK_DELAY_MS = 250
/** Atraso antes do fitView (ms). Maior = mais estável em notebooks fracos. */
const FOCUS_GROUP_FIT_DELAY_MS = 200
/** Duração da animação do zoom entre filtros (ms). Transição suave sem exagerar. */
const FOCUS_GROUP_FIT_DURATION_MS = 320

function MesaInvestigacaoPanelContent({
  setNodes,
  setEdges,
  setViewport,
  nodes,
  edges,
  lastMouseScreenRef,
  lastInteractedImageNodeIdRef,
  addImageNodeRef,
  onToast,
  onClearMesa,
  saveForUndo,
  onRevertLastEdge,
  filterCategoryId,
  onFilterCategoryId,
  onExportFilterToDb,
}: PanelProps) {
  const { screenToFlowPosition, fitView } = useReactFlow()
  const filterClickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const focusGroupFitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addImageNode = useCallback(
    (dataUrl: string, fileName?: string) => {
      saveForUndo()
      const pos = screenToFlowPosition(lastMouseScreenRef.current)
      const id = nextId()
      const newNode: MesaNode = {
        id,
        type: "image",
        position: pos,
        data: {
          dataUrl,
          fileName,
          ...(filterCategoryId ? { categoryId: filterCategoryId } : {}),
        },
      }
      setNodes((nds) => [...nds, newNode])
      lastInteractedImageNodeIdRef.current = id
      onToast("Imagem adicionada")
    },
    [setNodes, screenToFlowPosition, lastMouseScreenRef, lastInteractedImageNodeIdRef, onToast, saveForUndo, filterCategoryId]
  )

  useEffect(() => {
    addImageNodeRef.current = addImageNode
    return () => {
      addImageNodeRef.current = null
    }
  }, [addImageNode, addImageNodeRef])

  const onUploadClick = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        addImageNode(reader.result as string, file.name)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const addCommentNode = useCallback(() => {
    saveForUndo()
    const id = nextId()
    let position = screenToFlowPosition(lastMouseScreenRef.current)
    const lastImageId = lastInteractedImageNodeIdRef.current
    if (lastImageId) {
      const node = nodes.find((n) => n.id === lastImageId)
      if (node) {
        const w = 320
        position = { x: node.position.x + w + 20, y: node.position.y }
      }
    }
    const newNode: MesaNode = {
      id,
      type: "comment",
      position,
      data: { text: "" },
    }
    setNodes((nds) => [...nds, newNode])
    onToast("Comentário adicionado")
  }, [nodes, setNodes, screenToFlowPosition, lastMouseScreenRef, lastInteractedImageNodeIdRef, onToast, saveForUndo])

  const focusGroup = useCallback(
    (categoryId: string) => {
      const groupImageNodes = nodes.filter(
        (n) => n.type === "image" && (n.data as ImageNodeData).categoryId === categoryId
      )
      if (groupImageNodes.length === 0) {
        onToast("Nenhum item neste grupo")
        return
      }
      onFilterCategoryId(categoryId)
      if (focusGroupFitTimeoutRef.current) {
        clearTimeout(focusGroupFitTimeoutRef.current)
        focusGroupFitTimeoutRef.current = null
      }
      const commentIdsInGroup = getCommentIdsConnectedToGroupImages(nodes, edges, categoryId)
      const nodeIdsToFit = [
        ...groupImageNodes.map((n) => ({ id: n.id })),
        ...Array.from(commentIdsInGroup).map((id) => ({ id })),
      ]
      // Atraso maior para o React aplicar o filtro e pintar; animação mais curta = menos engasgo em notebook fraco
      focusGroupFitTimeoutRef.current = setTimeout(() => {
        focusGroupFitTimeoutRef.current = null
        fitView({
          nodes: nodeIdsToFit,
          padding: 0.25,
          duration: FOCUS_GROUP_FIT_DURATION_MS,
        })
      }, FOCUS_GROUP_FIT_DELAY_MS)
    },
    [nodes, edges, onFilterCategoryId, fitView, onToast]
  )

  const handleFilterClick = useCallback(
    (catId: string) => {
      if (filterClickTimeoutRef.current) clearTimeout(filterClickTimeoutRef.current)
      filterClickTimeoutRef.current = setTimeout(() => {
        filterClickTimeoutRef.current = null
        onFilterCategoryId(filterCategoryId === catId ? null : catId)
      }, FILTER_CLICK_DELAY_MS)
    },
    [filterCategoryId, onFilterCategoryId]
  )

  const handleFilterDoubleClick = useCallback(
    (e: React.MouseEvent, catId: string) => {
      e.preventDefault()
      e.stopPropagation()
      if (filterClickTimeoutRef.current) {
        clearTimeout(filterClickTimeoutRef.current)
        filterClickTimeoutRef.current = null
      }
      focusGroup(catId)
    },
    [focusGroup]
  )

  useEffect(() => {
    return () => {
      if (filterClickTimeoutRef.current) clearTimeout(filterClickTimeoutRef.current)
      if (focusGroupFitTimeoutRef.current) clearTimeout(focusGroupFitTimeoutRef.current)
    }
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-2 select-none">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onUploadClick}
        className="gap-1.5"
      >
        <ImagePlus className="size-4" />
        Adicionar Imagem
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addCommentNode}
        className="gap-1.5"
      >
        <MessageSquarePlus className="size-4" />
        Comentário
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClearMesa}
        className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
      >
        <Trash2 className="size-4" />
        Limpar Mesa
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRevertLastEdge}
        className="gap-1.5"
        title="Reverter última ligação (tira a última linhasinha adicionada)"
      >
        <Undo2 className="size-4" />
        Reverter
      </Button>
      {/* Filtro por categoria: ícone + corzinhas. select-none evita o pop-up de duplo clique do Edge. */}
      <div className="flex flex-wrap items-center gap-2 border-l border-[var(--aw-border)] pl-2 select-none">
        <span className="flex items-center gap-1.5 text-xs text-[var(--aw-text-muted)]" title="Filtrar por categoria">
          <Filter className="size-3.5" />
          Filtro
        </span>
        <button
          type="button"
          onClick={() => onFilterCategoryId(null)}
          className={`h-2.5 w-2.5 rounded-full border-2 border-[var(--aw-border)] transition select-none ${
            filterCategoryId === null ? "bg-[var(--aw-text-muted)]" : "bg-transparent hover:bg-[var(--aw-border)]/50"
          }`}
          title="Mostrar todos"
        />
        {MESA_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleFilterClick(cat.id)}
            onDoubleClick={(e) => handleFilterDoubleClick(e, cat.id)}
            className={`h-2.5 w-2.5 shrink-0 rounded-full transition hover:scale-110 select-none ${
              filterCategoryId === cat.id ? "ring-2 ring-offset-1 ring-[var(--aw-accent)]" : ""
            }`}
            style={{
              backgroundColor: cat.color,
              opacity: filterCategoryId === cat.id ? 1 : 0.7,
            }}
            title={`${cat.label}. Duplo clique: ir para este grupo`}
          />
        ))}
        {filterCategoryId && onExportFilterToDb && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onExportFilterToDb(filterCategoryId)}
            className="gap-1.5 border-[var(--aw-accent)]/50 text-[var(--aw-accent)] hover:bg-[var(--aw-accent)]/10"
            title="Enviar itens deste filtro para o banco de dados (imagens + comentários ligados + ordem)"
          >
            <CloudUpload className="size-4" />
            Enviar filtro ao banco
          </Button>
        )}
      </div>
    </div>
  )
}

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  animated: true,
  style: { stroke: "var(--aw-mesa-edge)", strokeWidth: 2 },
  markerEnd: "arrowclosed" as const,
}

type MesaInvestigacaoCanvasInnerProps = {
  focusNodeId?: string
  initial: PersistedState
  onSave: (nodes: MesaNode[], edges: Edge[], viewport: Viewport, isLocked?: boolean) => void
}

function MesaInvestigacaoCanvasInner({ focusNodeId, initial, onSave }: MesaInvestigacaoCanvasInnerProps) {
  const { fitView } = useReactFlow()
  const initialNodes = useMemo(
    () =>
      initial.nodes.map((n) => {
        if (n.type === "comment" && (n.data as CommentNodeData).locked) return { ...n, draggable: false }
        if (n.type === "image" && (n.data as ImageNodeData).locked) return { ...n, draggable: false }
        return n
      }),
    [initial.nodes]
  )
  const [nodes, setNodes, onNodesChange] = useNodesState<MesaNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const [viewport, setViewport] = useState(initial.viewport)
  const lastMouseScreenRef = useRef({ x: 0, y: 0 })
  const isMouseOverCanvasRef = useRef(false)
  const lastInteractedImageNodeIdRef = useRef<string | null>(null)
  const addImageNodeRef = useRef<((dataUrl: string, fileName?: string) => void) | null>(null)

  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastIdRef = useRef(0)
  const [isLocked, setIsLocked] = useState(initial.isLocked ?? false)
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const edgeOrderRef = useRef<string[]>([])

  const undoHistoryRef = useRef<PersistedState[]>([])
  const stateSnapshotRef = useRef<PersistedState>({
    nodes: initial.nodes,
    edges: initial.edges,
    viewport: initial.viewport,
  })

  useEffect(() => {
    stateSnapshotRef.current = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      viewport: { ...viewport },
    }
  }, [nodes, edges, viewport])

  const saveForUndo = useCallback(() => {
    const snap = stateSnapshotRef.current
    undoHistoryRef.current.push({
      nodes: JSON.parse(JSON.stringify(snap.nodes)),
      edges: JSON.parse(JSON.stringify(snap.edges)),
      viewport: { ...snap.viewport },
    })
    if (undoHistoryRef.current.length > MAX_UNDO_HISTORY) {
      undoHistoryRef.current.shift()
    }
  }, [])

  const addToast = useCallback((message: string) => {
    const id = ++toastIdRef.current
    setToasts((t) => [...t, { id, message }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, TOAST_DURATION_MS)
  }, [])

  const clearMesa = useCallback(() => {
    setNodes([])
    setEdges([])
    setViewport(DEFAULT_VIEWPORT)
  }, [setNodes, setEdges, setViewport])

  const openClearConfirm = useCallback(() => setShowClearConfirm(true), [])
  const closeClearConfirm = useCallback(() => setShowClearConfirm(false), [])

  const confirmClearMesa = useCallback(() => {
    saveForUndo()
    clearMesa()
    addToast("Mesa limpa")
    setShowClearConfirm(false)
  }, [clearMesa, addToast, saveForUndo])

  const handleExportFilterToDb = useCallback(
    async (categoryId: string) => {
      const payload = buildMesaSessaoPayload(nodes, edges, categoryId)
      const hasImages = payload && payload.images.length > 0
      const hasComments = payload && payload.comments.length > 0
      if (!payload || (!hasImages && !hasComments)) {
        addToast("Nenhum item para enviar (adicione imagens ou comentários).")
        return
      }
      const cat = MESA_CATEGORIES.find((c) => c.id === categoryId)
      const defaultName = cat ? `${cat.label} - ${new Date().toLocaleDateString("pt-BR")}` : ""
      const name = window.prompt("Nome da sessão (opcional):", defaultName) ?? defaultName
      try {
        await apiPostMesaSessao({
          categoryId,
          name: name.trim() || undefined,
          payload,
        })
        addToast("Sessão enviada ao banco.")
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao enviar."
        addToast(`Erro: ${msg}`)
      }
    },
    [nodes, edges, addToast]
  )

  const handleUndo = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        const target = e.target as HTMLElement
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return
        e.preventDefault()
        const prev = undoHistoryRef.current.pop()
        if (prev) {
          setNodes(prev.nodes)
          setEdges(prev.edges)
          setViewport(prev.viewport)
          addToast("Desfeito")
        }
      }
    },
    [setNodes, setEdges, setViewport, addToast]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleUndo)
    return () => window.removeEventListener("keydown", handleUndo)
  }, [handleUndo])

  const onConnect = useCallback(
    (params: Connection) => {
      saveForUndo()
      setEdges((eds) => {
        const next = addEdge(
          { ...params, ...defaultEdgeOptions },
          eds
        )
        const newEdge = next.find((e) => !eds.some((p) => p.id === e.id))
        if (newEdge) edgeOrderRef.current = [...edgeOrderRef.current, newEdge.id]
        return next
      })
    },
    [setEdges, saveForUndo]
  )

  useEffect(() => {
    const t = setTimeout(() => {
      onSave(nodes, edges, viewport, isLocked)
    }, 400)
    return () => clearTimeout(t)
  }, [nodes, edges, viewport, isLocked])

  useEffect(() => {
    if (!focusNodeId) return
    const t = setTimeout(() => {
      fitView({ nodes: [{ id: focusNodeId }], padding: 0.25, duration: 400 })
    }, 300)
    return () => clearTimeout(t)
  }, [focusNodeId, fitView])

  const onPaneMouseMove = useCallback((e: React.MouseEvent) => {
    lastMouseScreenRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onNodesDelete = useCallback(() => {
    saveForUndo()
  }, [saveForUndo])

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    saveForUndo()
    const ids = new Set(deleted.map((e) => e.id))
    edgeOrderRef.current = edgeOrderRef.current.filter((id) => !ids.has(id))
  }, [saveForUndo])

  const revertLastEdge = useCallback(() => {
    if (edgeOrderRef.current.length === 0) {
      addToast("Nenhuma ligação para reverter")
      return
    }
    const lastId = edgeOrderRef.current[edgeOrderRef.current.length - 1]
    edgeOrderRef.current = edgeOrderRef.current.slice(0, -1)
    setEdges((eds) => eds.filter((e) => e.id !== lastId))
    addToast("Ligação revertida")
  }, [setEdges, addToast])

  const onNodeDragStart = useCallback(() => {
    saveForUndo()
  }, [saveForUndo])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: MesaNode) => {
      if (node.type === "image") {
        lastInteractedImageNodeIdRef.current = node.id
      }
    },
    [lastInteractedImageNodeIdRef]
  )

  const canvasContainerRef = useRef<HTMLDivElement>(null)

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const target = document.activeElement as HTMLElement
    if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return
    const isCanvasFocused =
      canvasContainerRef.current?.contains(target) ?? false
    const isMouseOverCanvas = isMouseOverCanvasRef.current
    if (!isCanvasFocused && !isMouseOverCanvas) return
    const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
      i.type.startsWith("image/")
    )
    if (!item) return
    e.preventDefault()
    const file = item.getAsFile()
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      addImageNodeRef.current?.(dataUrl, file.name)
    }
    reader.readAsDataURL(file)
  }, [])

  useEffect(() => {
    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [handlePaste])

  useEffect(() => {
    if (!showClearConfirm) return
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeClearConfirm()
    }
    document.addEventListener("keydown", onEscape)
    return () => document.removeEventListener("keydown", onEscape)
  }, [showClearConfirm, closeClearConfirm])

  const displayNodes = useMemo(() => {
    if (!filterCategoryId) return nodes
    const commentIdsInGroup = getCommentIdsConnectedToGroupImages(nodes, edges, filterCategoryId)
    return nodes.map((n) => {
      if (n.type === "image") {
        const categoryId = (n.data as ImageNodeData).categoryId
        const match = categoryId === filterCategoryId
        return { ...n, style: { ...n.style, opacity: match ? 1 : 0.3 } }
      }
      if (n.type === "comment") {
        const match = commentIdsInGroup.has(n.id)
        return { ...n, style: { ...n.style, opacity: match ? 1 : 0.3 } }
      }
      return n
    })
  }, [nodes, edges, filterCategoryId])

  return (
    <div
      ref={canvasContainerRef}
      className="mesa-investigacao-canvas relative h-full min-h-[400px] w-full overflow-hidden"
      tabIndex={-1}
      onMouseEnter={() => {
        isMouseOverCanvasRef.current = true
      }}
      onMouseLeave={() => {
        isMouseOverCanvasRef.current = false
      }}
    >
      {/* Modal de confirmação: limpar mesa */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-mesa-title"
          aria-describedby="clear-mesa-desc"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeClearConfirm}
          />
          <div
            className="relative w-full max-w-md rounded-xl border-2 border-[var(--aw-border)] bg-[var(--aw-card)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--aw-danger)]/15 text-[var(--aw-danger)]">
                <AlertTriangle className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="clear-mesa-title"
                  className="text-lg font-semibold text-[var(--aw-text)]"
                >
                  Limpar mesa
                </h2>
                <p
                  id="clear-mesa-desc"
                  className="mt-1.5 text-sm text-[var(--aw-text-muted)]"
                >
                  Tem certeza que deseja limpar a mesa? Todos os itens (imagens e comentários) serão removidos.
                </p>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[var(--aw-border)] bg-transparent text-[var(--aw-text)] hover:bg-[var(--aw-border)]/50"
                    onClick={closeClearConfirm}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="bg-[var(--aw-danger)] text-white hover:bg-[var(--aw-danger)]/90"
                    onClick={confirmClearMesa}
                  >
                    Limpar mesa
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notificações flutuantes */}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto animate-in slide-in-from-right-4 rounded-lg border border-[var(--aw-border)] bg-[var(--aw-card)] px-4 py-3 text-sm text-[var(--aw-text)] shadow-lg"
          >
            {toast.message}
          </div>
        ))}
      </div>
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeDragStart={onNodeDragStart}
        onNodeClick={onNodeClick}
        onPaneMouseMove={onPaneMouseMove}
        viewport={viewport}
        onViewportChange={setViewport}
        defaultViewport={initial.viewport}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={{ stroke: "var(--aw-mesa-edge)", strokeWidth: 2 }}
        connectionLineType="smoothstep"
        connectionRadius={28}
        edgesReconnectable
        nodesDraggable={!isLocked}
        nodesConnectable={true}
        panOnDrag={!isLocked}
        nodeTypes={NODE_TYPES as import("@xyflow/react").NodeTypes}
        minZoom={0.05}
        maxZoom={2}
        fitView={false}
        style={{ backgroundColor: "transparent" }}
        className="mesa-react-flow-transparent"
      >
        {/* Fundo espacial dentro do React Flow (primeira camada, atrás do Background e do pane) */}
        <Panel position="top-left" className="!left-0 !top-0 !right-0 !bottom-0 !w-full !h-full !max-w-none !transform-none pointer-events-none" style={{ zIndex: -2, margin: 0, padding: 0 }}>
          <div className="mesa-space-bg absolute inset-0 h-full w-full" aria-hidden>
            <div className="mesa-space-bg__nebulas" />
            <div className="mesa-space-bg__nebulas-2" />
            <div className="mesa-space-bg__stars" />
            <div className="mesa-space-bg__stars-slow" />
            <div className="mesa-space-planet mesa-space-planet--1" />
            <div className="mesa-space-planet mesa-space-planet--2" />
          </div>
        </Panel>
        <Background />
        <Panel position="top-left" className="w-full">
          <div className="flex flex-wrap items-center gap-2">
            <MesaInvestigacaoPanelContent
            setNodes={setNodes}
            setEdges={setEdges}
            setViewport={setViewport}
            nodes={nodes}
            edges={edges}
            lastMouseScreenRef={lastMouseScreenRef}
            lastInteractedImageNodeIdRef={lastInteractedImageNodeIdRef}
            addImageNodeRef={addImageNodeRef}
            onToast={addToast}
            onClearMesa={openClearConfirm}
            saveForUndo={saveForUndo}
            onRevertLastEdge={revertLastEdge}
            filterCategoryId={filterCategoryId}
            onFilterCategoryId={setFilterCategoryId}
            onExportFilterToDb={handleExportFilterToDb}
          />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const next = !isLocked
                setIsLocked(next)
                onSave(nodes, edges, viewport, next)
              }}
              className="h-8 w-8 shrink-0 border-[var(--aw-border)] bg-[var(--aw-card)] text-[var(--aw-text-muted)] hover:bg-[var(--aw-border)]/50 hover:text-[var(--aw-text)]"
              title={isLocked ? "Desbloquear mesa (arrastar e zoom)" : "Bloquear mesa (só ligações)"}
            >
              {isLocked ? (
                <Lock className="size-4" />
              ) : (
                <Unlock className="size-4" />
              )}
            </Button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export function MesaInvestigacaoCanvas({ focusNodeId }: { focusNodeId?: string } = {}) {
  const [initial, setInitial] = useState<PersistedState | null>(null)

  useEffect(() => {
    let cancelled = false
    apiGetMesa()
      .then((data) => {
        if (cancelled) return
        setInitial({
          nodes: (data.nodes ?? []) as MesaNode[],
          edges: (data.edges ?? []) as Edge[],
          viewport: data.viewport ?? getDefaultState().viewport,
          isLocked: data.isLocked ?? false,
        })
      })
      .catch(() => { if (!cancelled) setInitial(getDefaultState()) })
    return () => { cancelled = true }
  }, [])

  const handleSave = useCallback(
    (nodes: MesaNode[], edges: Edge[], viewport: Viewport, isLocked?: boolean) => {
      apiPutMesa({ nodes, edges, viewport, isLocked }).catch(() => {})
    },
    []
  )

  if (initial === null) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm text-[var(--aw-text-muted)]">
        Carregando mesa…
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <MesaInvestigacaoCanvasInner
        focusNodeId={focusNodeId}
        initial={initial}
        onSave={handleSave}
      />
    </ReactFlowProvider>
  )
}
