/**
 * Bookmarks — helper e tipo (persistência via API, @/lib/api).
 */

import type { BookmarkItemApi } from "@/lib/api"

export type BookmarkItem = BookmarkItemApi

/**
 * Garante que a URL tenha protocolo (http/https).
 * URLs como "www.google.com" viram "https://www.google.com" ao abrir.
 */
export function normalizeBookmarkUrl(url: string): string {
  const u = url.trim()
  if (!u) return u
  if (/^https?:\/\//i.test(u)) return u
  return `https://${u}`
}
