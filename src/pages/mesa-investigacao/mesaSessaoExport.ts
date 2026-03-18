/**
 * Extrai do canvas (nodes + edges) o payload de uma sessão para um filtro (categoria):
 * - A partir das imagens com essa categoria, exporta toda a componente conexa (imagens + comentários
 *   ligados direta ou indiretamente) + todas as arestas entre eles.
 * - Se não houver imagens no filtro: sessão só de comentários (comments + commentEdges).
 */

import type { Edge } from "@xyflow/react"
import type { MesaNode } from "./types"
import type { ImageNodeData, CommentNodeData } from "./types"
import type { MesaSessaoPayloadApi } from "@/lib/api"

const nodeIdsFromNodes = (nodes: MesaNode[]) => new Set(nodes.map((n) => n.id))

/** BFS a partir dos seeds: devolve o conjunto de ids de nós alcançáveis pelas arestas (grafo não direcionado). */
function connectedComponent(seedIds: Set<string>, edges: Edge[]): Set<string> {
  const adj = new Map<string, string[]>()
  for (const e of edges) {
    if (e.source === e.target) continue
    const add = (a: string, b: string) => {
      const list = adj.get(a) ?? []
      if (!list.includes(b)) list.push(b)
      adj.set(a, list)
    }
    add(e.source, e.target)
    add(e.target, e.source)
  }
  const component = new Set<string>()
  const queue = [...seedIds]
  for (const id of queue) component.add(id)
  let i = 0
  while (i < queue.length) {
    const u = queue[i++]
    for (const v of adj.get(u) ?? []) {
      if (!component.has(v)) {
        component.add(v)
        queue.push(v)
      }
    }
  }
  return component
}

/** Ordem topológica das imagens (só arestas imagem -> imagem). */
function topologicalImageOrder(
  imageIds: Set<string>,
  edges: Edge[]
): string[] {
  const imageEdges = edges.filter(
    (e) => imageIds.has(e.source) && imageIds.has(e.target) && e.source !== e.target
  )
  const inDegree = new Map<string, number>()
  imageIds.forEach((id) => inDegree.set(id, 0))
  for (const e of imageEdges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  }
  const queue = [...imageIds].filter((id) => inDegree.get(id) === 0)
  const order: string[] = []
  const outNeighbors = new Map<string, string[]>()
  for (const e of imageEdges) {
    const list = outNeighbors.get(e.source) ?? []
    if (!list.includes(e.target)) list.push(e.target)
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

/**
 * Constrói o payload da sessão para enviar ao banco.
 * Quando há imagens do filtro: exporta toda a componente conexa (imagens filtradas + todos os
 * comentários e imagens ligados direta ou indiretamente a elas) e todas as arestas entre eles.
 */
export function buildMesaSessaoPayload(
  nodes: MesaNode[],
  edges: Edge[],
  categoryId: string
): MesaSessaoPayloadApi | null {
  const seedImageNodes = nodes.filter(
    (n): n is MesaNode & { type: "image"; data: ImageNodeData } =>
      n.type === "image" &&
      (n.data as ImageNodeData).categoryId === categoryId &&
      !!(n.data as ImageNodeData).dataUrl
  )
  const seedIds = new Set(seedImageNodes.map((n) => n.id))

  if (seedIds.size > 0) {
    const componentIds = connectedComponent(seedIds, edges)
    const nodeById = new Map(nodes.map((n) => [n.id, n]))

    const componentImages = nodes.filter(
      (n): n is MesaNode & { type: "image"; data: ImageNodeData } =>
        n.type === "image" && componentIds.has(n.id) && !!(n.data as ImageNodeData).dataUrl
    )
    const componentComments = nodes.filter(
      (n): n is MesaNode & { type: "comment"; data: CommentNodeData } =>
        n.type === "comment" && componentIds.has(n.id) && n.data != null
    )
    const componentEdges = edges.filter(
      (e) => componentIds.has(e.source) && componentIds.has(e.target) && e.source !== e.target
    )

    const imageIds = new Set(componentImages.map((n) => n.id))
    const images = componentImages.map((n) => ({
      id: n.id,
      position: n.position,
      data: { ...n.data } as Record<string, unknown>,
    }))

    const comments: MesaSessaoPayloadApi["comments"] = componentComments.map((node) => {
      const data = node.data as CommentNodeData
      let imageId: string | undefined
      for (const e of componentEdges) {
        if (e.source === node.id && imageIds.has(e.target)) {
          imageId = e.target
          break
        }
        if (e.target === node.id && imageIds.has(e.source)) {
          imageId = e.source
          break
        }
      }
      return {
        id: node.id,
        position: node.position,
        data: { ...data } as Record<string, unknown>,
        ...(imageId ? { imageId } : {}),
      }
    })

    const imageOrder = topologicalImageOrder(imageIds, componentEdges)
    return {
      images,
      comments,
      imageOrder,
      edges: componentEdges.map((e) => ({ source: e.source, target: e.target })),
    }
  }

  // Caso específico: só comentários na mesa (sem imagens no filtro)
  const commentNodes = nodes.filter(
    (n): n is MesaNode & { type: "comment"; data: CommentNodeData } =>
      n.type === "comment" && n.data != null
  )
  if (commentNodes.length === 0) return null

  const commentIds = new Set(commentNodes.map((n) => n.id))
  const commentEdges = edges.filter(
    (e) => commentIds.has(e.source) && commentIds.has(e.target) && e.source !== e.target
  )

  const comments: MesaSessaoPayloadApi["comments"] = commentNodes.map((n) => ({
    id: n.id,
    position: n.position,
    data: { ...n.data } as Record<string, unknown>,
    // sem imageId: sessão só de comentários
  }))

  return {
    images: [],
    comments,
    imageOrder: [],
    commentEdges: commentEdges.map((e) => ({ source: e.source, target: e.target })),
  }
}
