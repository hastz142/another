import type { Node, Edge, Viewport } from "@xyflow/react"

/** Categorias fixas: origem do problema (Dados / Interface / Fluxo / Lógica) */
export interface MesaCategory {
  id: string
  color: string
  label: string
}

export const MESA_CATEGORIES: MesaCategory[] = [
  { id: "dados", color: "#3b82f6", label: "Dados" },
  { id: "ui", color: "#eab308", label: "Interface" },
  { id: "fluxo", color: "#a855f7", label: "Fluxo" },
  { id: "logica", color: "#14b8a6", label: "Lógica" },
]

export function getCategoryById(id: string | undefined): MesaCategory | undefined {
  if (!id) return undefined
  return MESA_CATEGORIES.find((c) => c.id === id)
}

export interface ImageNodeData extends Record<string, unknown> {
  dataUrl: string
  fileName?: string
  scanline?: boolean
  /** Id da categoria (filtro visual); ver MESA_CATEGORIES */
  categoryId?: string
  /** Imagem bloqueada: não arrastável; ao tentar arrastar, trava e destaca o cadeado */
  locked?: boolean
}

export interface CommentNodeData extends Record<string, unknown> {
  text: string
  width?: number
  height?: number
  /** Comentário bloqueado: texto só leitura e não redimensionável */
  locked?: boolean
}

export type MesaNode = Node<ImageNodeData | CommentNodeData>

export interface PersistedState {
  nodes: MesaNode[]
  edges: Edge[]
  viewport: Viewport
  /** Estado do cadeado: mesa bloqueada (só ligações) ou desbloqueada (arrastar e zoom). Persistido para manter ao mudar de ecrã. */
  isLocked?: boolean
}

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }

export const getDefaultState = (): PersistedState => ({
  nodes: [],
  edges: [],
  viewport: DEFAULT_VIEWPORT,
  isLocked: false,
})
