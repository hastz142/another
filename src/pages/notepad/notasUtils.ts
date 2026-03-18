/**
 * Utilitários para a listagem de notas: preview sem HTML e datas relativas.
 */

/** Remove todas as tags HTML e normaliza espaços para texto puro. */
export function stripHtml(html: string): string {
  if (!html || typeof html !== "string") return ""
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  return text
}

/** Retorna texto curto para preview (já sem HTML), limitado por caracteres. */
export function previewText(html: string, maxLength = 160): string {
  const text = stripHtml(html)
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + "…"
}

/** Formata timestamp para exibição no card: "Editado hoje", "Ontem", "Há X horas", etc. */
export function formatRelativeTime(ms: number): string {
  if (!ms || ms <= 0) return "—"
  const now = Date.now()
  const diff = now - ms
  const sec = Math.floor(diff / 1000)
  const min = Math.floor(sec / 60)
  const hour = Math.floor(min / 60)
  const day = Math.floor(hour / 24)

  const d = new Date(ms)
  const today = new Date()
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()

  if (isToday) {
    if (min < 1) return "Agora"
    if (min < 60) return `Há ${min} min`
    return `Hoje, ${hour}h`
  }
  if (isYesterday) return "Ontem"
  if (day < 7) return `Há ${day} dias`
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}
