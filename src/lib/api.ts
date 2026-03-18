/**
 * Cliente da API do backend (dados que antes eram só localStorage).
 * Usa o proxy /api -> localhost:3001 em dev. Em produção, apontar o mesmo host ou configurar VITE_API_BASE.
 */

const BASE = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE
  ? String(import.meta.env.VITE_API_BASE)
  : ""

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || res.statusText || `HTTP ${res.status}`)
  return data as T
}

// Bookmarks
export type BookmarkItemApi = {
  id: string
  url: string
  title: string
  tags: string[]
  source: string
  note: string
  createdAt: number
}

export async function apiGetBookmarks(): Promise<BookmarkItemApi[]> {
  return request<BookmarkItemApi[]>("/api/bookmarks")
}

export async function apiPostBookmark(item: Partial<BookmarkItemApi> & { id?: string }): Promise<BookmarkItemApi> {
  return request<BookmarkItemApi>("/api/bookmarks", {
    method: "POST",
    body: JSON.stringify(item),
  })
}

export async function apiPutBookmark(id: string, patch: Partial<BookmarkItemApi>): Promise<BookmarkItemApi> {
  return request<BookmarkItemApi>(`/api/bookmarks/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  })
}

export async function apiDeleteBookmark(id: string): Promise<void> {
  return request<void>(`/api/bookmarks/${encodeURIComponent(id)}`, { method: "DELETE" })
}

// Ideias
export type IdeiaItemApi = { id: string; text: string; createdAt: number }

export async function apiGetIdeias(): Promise<IdeiaItemApi[]> {
  return request<IdeiaItemApi[]>("/api/ideias")
}

export async function apiPostIdeia(item: Partial<IdeiaItemApi> & { id?: string }): Promise<IdeiaItemApi> {
  return request<IdeiaItemApi>("/api/ideias", {
    method: "POST",
    body: JSON.stringify(item),
  })
}

export async function apiPutIdeia(id: string, patch: { text?: string }): Promise<IdeiaItemApi> {
  return request<IdeiaItemApi>(`/api/ideias/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  })
}

export async function apiDeleteIdeia(id: string): Promise<void> {
  return request<void>(`/api/ideias/${encodeURIComponent(id)}`, { method: "DELETE" })
}

// Notas
export type NotaItemApi = {
  id: string
  title: string
  content: string
  tags?: string[]
  pinned?: boolean
  pinnedOrder?: number
  updatedAt?: number
}

export async function apiGetNotas(): Promise<NotaItemApi[]> {
  return request<NotaItemApi[]>("/api/notas")
}

export async function apiGetNota(id: string): Promise<NotaItemApi> {
  return request<NotaItemApi>(`/api/notas/${encodeURIComponent(id)}`)
}

export async function apiPostNota(item: Partial<NotaItemApi> & { id?: string }): Promise<NotaItemApi> {
  return request<NotaItemApi>("/api/notas", {
    method: "POST",
    body: JSON.stringify(item),
  })
}

export async function apiPutNota(id: string, patch: Partial<NotaItemApi>): Promise<NotaItemApi> {
  return request<NotaItemApi>(`/api/notas/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  })
}

export async function apiDeleteNota(id: string): Promise<void> {
  return request<void>(`/api/notas/${encodeURIComponent(id)}`, { method: "DELETE" })
}

// Notepad completed (checklist task completion map)
export async function apiGetNotepadCompleted(): Promise<Record<string, string[]>> {
  return request<Record<string, string[]>>("/api/notepad-completed")
}

export async function apiPutNotepadCompleted(payload: Record<string, string[]>): Promise<Record<string, string[]>> {
  return request<Record<string, string[]>>("/api/notepad-completed", {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

// Custom checklists
export type CustomChecklistApi = { id: string; name: string; items: { type: string; text: string; id?: string }[] }

export async function apiGetChecklists(): Promise<CustomChecklistApi[]> {
  return request<CustomChecklistApi[]>("/api/checklists")
}

export async function apiPostChecklist(item: Partial<CustomChecklistApi> & { id?: string }): Promise<CustomChecklistApi> {
  return request<CustomChecklistApi>("/api/checklists", {
    method: "POST",
    body: JSON.stringify(item),
  })
}

export async function apiPutChecklist(id: string, patch: Partial<CustomChecklistApi>): Promise<CustomChecklistApi> {
  return request<CustomChecklistApi>(`/api/checklists/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  })
}

export async function apiDeleteChecklist(id: string): Promise<void> {
  return request<void>(`/api/checklists/${encodeURIComponent(id)}`, { method: "DELETE" })
}

// Fluxos
export type FluxoItemApi = {
  id: string
  name: string
  nodes: unknown[]
  edges: { source: string; target: string }[]
}

export async function apiGetFluxos(): Promise<FluxoItemApi[]> {
  return request<FluxoItemApi[]>("/api/fluxos")
}

export async function apiPostFluxo(item: Partial<FluxoItemApi> & { id?: string }): Promise<FluxoItemApi> {
  return request<FluxoItemApi>("/api/fluxos", {
    method: "POST",
    body: JSON.stringify(item),
  })
}

export async function apiPutFluxo(id: string, patch: Partial<FluxoItemApi>): Promise<FluxoItemApi> {
  return request<FluxoItemApi>(`/api/fluxos/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  })
}

export async function apiDeleteFluxo(id: string): Promise<void> {
  return request<void>(`/api/fluxos/${encodeURIComponent(id)}`, { method: "DELETE" })
}

// Mesa estado
export type MesaEstadoApi = {
  nodes: unknown[]
  edges: unknown[]
  viewport: { x: number; y: number; zoom: number }
  isLocked?: boolean
}

export async function apiGetMesa(): Promise<MesaEstadoApi> {
  return request<MesaEstadoApi>("/api/mesa")
}

export async function apiPutMesa(payload: MesaEstadoApi): Promise<MesaEstadoApi> {
  return request<MesaEstadoApi>("/api/mesa", {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

// Mesa sessoes (exportar filtro da mesa para o banco)
export type MesaSessaoPayloadApi = {
  images: Array<{ id: string; position: { x: number; y: number }; data: Record<string, unknown> }>
  /** Comentários: imageId opcional (ausente em sessões só de comentários). */
  comments: Array<{
    id: string
    position: { x: number; y: number }
    data: Record<string, unknown>
    imageId?: string
  }>
  imageOrder: string[]
  /** Ligações entre comentários (sessões só de comentários). */
  commentEdges?: Array<{ source: string; target: string }>
  /** Grafo completo da sessão: todas as ligações entre nós exportados (para restaurar fluxo inteiro). */
  edges?: Array<{ source: string; target: string }>
}

export type MesaSessaoApi = {
  id: string
  name: string
  categoryId: string
  payload: MesaSessaoPayloadApi
  createdAt: number
  updatedAt: number
}

export async function apiGetMesaSessoes(): Promise<MesaSessaoApi[]> {
  return request<MesaSessaoApi[]>("/api/mesa-sessoes")
}

export async function apiGetMesaSessao(id: string): Promise<MesaSessaoApi> {
  return request<MesaSessaoApi>(`/api/mesa-sessoes/${encodeURIComponent(id)}`)
}

export async function apiPostMesaSessao(item: {
  id?: string
  name?: string
  categoryId: string
  payload: MesaSessaoPayloadApi
}): Promise<MesaSessaoApi> {
  return request<MesaSessaoApi>("/api/mesa-sessoes", {
    method: "POST",
    body: JSON.stringify(item),
  })
}

export async function apiDeleteMesaSessao(id: string): Promise<void> {
  return request<void>(`/api/mesa-sessoes/${encodeURIComponent(id)}`, { method: "DELETE" })
}

// Pomodoro settings
export type PomodoroSettingsApi = {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakAfterCycles: number
}

export async function apiGetPomodoroSettings(): Promise<PomodoroSettingsApi> {
  return request<PomodoroSettingsApi>("/api/pomodoro-settings")
}

export async function apiPutPomodoroSettings(settings: PomodoroSettingsApi): Promise<PomodoroSettingsApi> {
  return request<PomodoroSettingsApi>("/api/pomodoro-settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  })
}
