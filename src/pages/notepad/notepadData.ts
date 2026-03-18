/**
 * Dados partilhados do Notepad: checklists custom e conteúdo da Mesa de Investigação.
 * Persistência via API (@/lib/api); tipos e helpers locais.
 */

/** Nota: título obrigatório + conteúdo (texto com links; links de imagem abrem em pop-up). */
export interface NotaItem {
  id: string
  title: string
  content: string
  tags?: string[]
  pinned?: boolean
  pinnedOrder?: number
  updatedAt?: number
}

/** Lista de checklists built-in (só id e nome) para a sidebar. */
export const BUILT_IN_CHECKLIST_NAV: { id: string; name: string }[] = [
  { id: "infra", name: "Base Infra & Backend" },
  { id: "fluxo", name: "Teste Fluxo" },
]

export interface CustomChecklist {
  id: string
  name: string
  items: ChecklistItemExport[]
}

export interface ChecklistItemExport {
  type: "header" | "task"
  text: string
  id?: string
}

/** Um fluxo de investigação: nome + estado da mesa (nodes/edges) para derivar seções, comentários, etc. */
export interface FluxoItem {
  id: string
  name: string
  nodes: Array<{
    id: string
    type?: string
    data?: { dataUrl?: string; fileName?: string; text?: string; categoryId?: string }
  }>
  edges: Array<{ source: string; target: string }>
}

/** Tipo de conteúdo derivado de nodes/edges (seções, comentários, ordem do fluxo). */
export interface MesaContent {
  images: MesaImageItem[]
  comments: { id: string; text: string }[]
  hasSoltas: boolean
  flowOrder: string[]
}

export interface MesaImageItem {
  id: string
  dataUrl: string
  fileName?: string
  categoryId?: string
  edgeCount: number
  nextImageIds: string[]
  prevImageIds: string[]
  connectedCommentIds: string[]
}

function topologicalImageOrder(
  imageIds: Set<string>,
  edges: Array<{ source: string; target: string }>
): string[] {
  const imageEdges = edges.filter((e) => imageIds.has(e.source) && imageIds.has(e.target))
  const inDegree = new Map<string, number>()
  imageIds.forEach((id) => inDegree.set(id, 0))
  for (const e of imageEdges) {
    if (e.source !== e.target) inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  }
  const queue = [...imageIds].filter((id) => inDegree.get(id) === 0)
  const order: string[] = []
  const outNeighbors = new Map<string, string[]>()
  for (const e of imageEdges) {
    if (e.source === e.target) continue
    const list = outNeighbors.get(e.source) ?? []
    list.push(e.target)
    outNeighbors.set(e.source, list)
  }
  while (queue.length > 0) {
    const u = queue.shift()!
    order.push(u)
    for (const v of outNeighbors.get(u) ?? []) {
      const d = (inDegree.get(v) ?? 0) - 1
      inDegree.set(v, d)
      if (d === 0) queue.push(v)
    }
  }
  const remaining = [...imageIds].filter((id) => !order.includes(id))
  return [...order, ...remaining]
}

/** Deriva conteúdo da mesa (imagens, comentários, ordem) a partir de nodes e edges. */
export function deriveMesaContent(
  nodes: FluxoItem["nodes"],
  edges: FluxoItem["edges"]
): MesaContent {
  const imageIds = new Set(
    nodes.filter((n) => n.type === "image" && n.data?.dataUrl).map((n) => n.id)
  )
  const commentIds = new Set(
    nodes.filter((n) => n.type === "comment").map((n) => n.id)
  )
  const edgeCountByNode = new Map<string, number>()
  const nextImageByNode = new Map<string, string[]>()
  const prevImageByNode = new Map<string, string[]>()
  const commentIdsByImage = new Map<string, string[]>()
  for (const e of edges) {
    edgeCountByNode.set(e.source, (edgeCountByNode.get(e.source) ?? 0) + 1)
    edgeCountByNode.set(e.target, (edgeCountByNode.get(e.target) ?? 0) + 1)
    if (imageIds.has(e.source) && imageIds.has(e.target) && e.source !== e.target) {
      const next = nextImageByNode.get(e.source) ?? []
      if (!next.includes(e.target)) next.push(e.target)
      nextImageByNode.set(e.source, next)
      const prev = prevImageByNode.get(e.target) ?? []
      if (!prev.includes(e.source)) prev.push(e.source)
      prevImageByNode.set(e.target, prev)
    }
    if (imageIds.has(e.source) && commentIds.has(e.target)) {
      const list = commentIdsByImage.get(e.source) ?? []
      if (!list.includes(e.target)) list.push(e.target)
      commentIdsByImage.set(e.source, list)
    }
    if (commentIds.has(e.source) && imageIds.has(e.target)) {
      const list = commentIdsByImage.get(e.target) ?? []
      if (!list.includes(e.source)) list.push(e.source)
      commentIdsByImage.set(e.target, list)
    }
  }
  const images: MesaImageItem[] = nodes
    .filter((n) => n.type === "image" && n.data?.dataUrl)
    .map((n) => ({
      id: n.id,
      dataUrl: n.data!.dataUrl!,
      fileName: n.data!.fileName,
      categoryId: n.data!.categoryId,
      edgeCount: edgeCountByNode.get(n.id) ?? 0,
      nextImageIds: nextImageByNode.get(n.id) ?? [],
      prevImageIds: prevImageByNode.get(n.id) ?? [],
      connectedCommentIds: commentIdsByImage.get(n.id) ?? [],
    }))
  const comments = nodes
    .filter((n) => n.type === "comment" && n.data)
    .map((n) => ({ id: n.id, text: typeof n.data?.text === "string" ? n.data.text : "" }))
  const hasSoltas = images.some((img) => img.edgeCount === 0)
  const flowOrder = topologicalImageOrder(imageIds, edges)
  return { images, comments, hasSoltas, flowOrder }
}

/** Use apiGetMesa() e deriveMesaContent(nodes, edges) para obter o conteúdo da mesa. */
