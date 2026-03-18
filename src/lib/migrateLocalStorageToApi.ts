/**
 * Migração única: lê dados que estavam em localStorage e envia para a API, depois remove as chaves.
 * Executar uma vez no arranque da app (ex.: em App.tsx).
 */

import {
  apiPostNota,
  apiPostBookmark,
  apiPostIdeia,
  apiPutPomodoroSettings,
  apiPutMesa,
  apiPutNotepadCompleted,
  apiPostChecklist,
  apiPostFluxo,
} from "./api"

const KEYS = {
  NOTAS: "another-world-notepad-notas",
  CUSTOM_CHECKLISTS: "another-world-notepad-custom-checklists",
  FLUXOS: "another-world-notepad-fluxos",
  MESA: "another-world-mesa-investigacao",
  IDEIAS: "another-world-ideias",
  BOOKMARKS: "another-world-bookmarks",
  REFERENCIAS: "another-world-referencias",
  POMODORO: "another-world-pomodoro-settings",
  COMPLETED_MAP: "another-world-notepad-completed-map",
  COMPLETED_INFRA: "another-world-notepad-completed",
  COMPLETED_FLUXO: "another-world-checklist-fluxo-completed",
} as const

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {}
}

export async function runMigrationOnce(): Promise<void> {
  if (typeof window === "undefined") return

  // Notas
  const notas = read<Array<{ id: string; title: string; content: string; tags?: string[]; pinned?: boolean; pinnedOrder?: number }>>(KEYS.NOTAS)
  if (Array.isArray(notas) && notas.length > 0) {
    for (const n of notas) {
      try {
        await apiPostNota({
          id: n.id,
          title: n.title ?? "",
          content: n.content ?? "",
          tags: n.tags ?? [],
          pinned: n.pinned ?? false,
          pinnedOrder: n.pinnedOrder ?? 0,
        })
      } catch {
        // continua com as restantes
      }
    }
    remove(KEYS.NOTAS)
  }

  // Ideias
  const ideias = read<Array<{ id: string; text: string; createdAt: number }>>(KEYS.IDEIAS)
  if (Array.isArray(ideias) && ideias.length > 0) {
    for (const i of ideias) {
      try {
        await apiPostIdeia({ id: i.id, text: i.text, createdAt: i.createdAt })
      } catch {}
    }
    remove(KEYS.IDEIAS)
  }

  // Bookmarks (e referências antigas)
  let bookmarks = read<Array<{ id: string; url: string; title: string; tags?: string[]; source?: string; note?: string; createdAt: number }>>(KEYS.BOOKMARKS)
  const refs = read<Array<{ id: string; title: string; url: string; note: string; createdAt: number }>>(KEYS.REFERENCIAS)
  if (Array.isArray(refs) && refs.length > 0) {
    const migrated = refs.map((r) => ({
      id: `bm-ref-${r.id}`,
      url: (r.url || "").trim(),
      title: (r.title || "").trim(),
      tags: [] as string[],
      source: "",
      note: (r.note || "").trim(),
      createdAt: r.createdAt,
    }))
    bookmarks = Array.isArray(bookmarks) ? [...migrated, ...bookmarks] : migrated
    remove(KEYS.REFERENCIAS)
  }
  if (Array.isArray(bookmarks) && bookmarks.length > 0) {
    for (const b of bookmarks) {
      try {
        await apiPostBookmark({
          id: b.id,
          url: b.url ?? "",
          title: b.title ?? "",
          tags: b.tags ?? [],
          source: b.source ?? "",
          note: b.note ?? "",
          createdAt: b.createdAt,
        })
      } catch {}
    }
    remove(KEYS.BOOKMARKS)
  }

  // Pomodoro
  const pomodoro = read<{ workMinutes?: number; shortBreakMinutes?: number; longBreakMinutes?: number; longBreakAfterCycles?: number }>(KEYS.POMODORO)
  if (pomodoro && typeof pomodoro === "object") {
    try {
      await apiPutPomodoroSettings({
        workMinutes: Math.max(1, Math.min(60, pomodoro.workMinutes ?? 25)),
        shortBreakMinutes: Math.max(1, Math.min(30, pomodoro.shortBreakMinutes ?? 5)),
        longBreakMinutes: Math.max(1, Math.min(60, pomodoro.longBreakMinutes ?? 15)),
        longBreakAfterCycles: Math.max(2, Math.min(10, pomodoro.longBreakAfterCycles ?? 4)),
      })
    } catch {}
    remove(KEYS.POMODORO)
  }

  // Mesa estado
  const mesa = read<{ nodes?: unknown[]; edges?: unknown[]; viewport?: { x: number; y: number; zoom: number }; isLocked?: boolean }>(KEYS.MESA)
  if (mesa && (Array.isArray(mesa.nodes) || Array.isArray(mesa.edges))) {
    try {
      await apiPutMesa({
        nodes: mesa.nodes ?? [],
        edges: mesa.edges ?? [],
        viewport: mesa.viewport ?? { x: 0, y: 0, zoom: 1 },
        isLocked: mesa.isLocked ?? false,
      })
    } catch {}
    remove(KEYS.MESA)
  }

  // Notepad completed map (unificar os 3 formatos antigos)
  let completedMap: Record<string, string[]> = {}
  const mapRaw = read<Record<string, string[]>>(KEYS.COMPLETED_MAP)
  if (mapRaw && typeof mapRaw === "object") completedMap = { ...mapRaw }
  const infraRaw = read<string[]>(KEYS.COMPLETED_INFRA)
  if (Array.isArray(infraRaw)) completedMap["infra"] = infraRaw
  const fluxoRaw = read<string[]>(KEYS.COMPLETED_FLUXO)
  if (Array.isArray(fluxoRaw)) completedMap["fluxo"] = fluxoRaw
  if (Object.keys(completedMap).length > 0) {
    try {
      await apiPutNotepadCompleted(completedMap)
    } catch {}
    remove(KEYS.COMPLETED_MAP)
    remove(KEYS.COMPLETED_INFRA)
    remove(KEYS.COMPLETED_FLUXO)
  }

  // Custom checklists
  const checklists = read<Array<{ id: string; name: string; items: unknown[] }>>(KEYS.CUSTOM_CHECKLISTS)
  if (Array.isArray(checklists) && checklists.length > 0) {
    for (const c of checklists) {
      try {
        await apiPostChecklist({
          id: c.id,
          name: c.name,
          items: (c.items ?? []) as { type: string; text: string; id?: string }[],
        })
      } catch {}
    }
    remove(KEYS.CUSTOM_CHECKLISTS)
  }

  // Fluxos
  const fluxos = read<Array<{ id: string; name: string; nodes: unknown[]; edges: unknown[] }>>(KEYS.FLUXOS)
  if (Array.isArray(fluxos) && fluxos.length > 0) {
    for (const f of fluxos) {
      try {
        await apiPostFluxo({
          id: f.id,
          name: f.name,
          nodes: f.nodes ?? [],
          edges: (f.edges ?? []) as { source: string; target: string }[],
        })
      } catch {}
    }
    remove(KEYS.FLUXOS)
  }
}
