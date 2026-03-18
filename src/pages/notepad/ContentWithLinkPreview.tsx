import { useCallback } from "react"

const URL_REGEX = /(https?:\/\/[^\s]+|data:image\/[^;\s]+)/gi
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i

function isImageUrl(url: string): boolean {
  const trimmed = url.trim()
  if (/^data:image\//i.test(trimmed)) return true
  try {
    const u = new URL(trimmed)
    const path = u.pathname
    return IMAGE_EXTENSIONS.test(path) || path === ""
  } catch {
    return false
  }
}

type ContentWithLinkPreviewProps = {
  content: string
  onImageLinkClick: (url: string) => void
  className?: string
}

/**
 * Renderiza o texto da nota com URLs clicáveis.
 * Ao clicar num link de imagem, chama onImageLinkClick para abrir no pop-up.
 * Outros links abrem noutra aba.
 */
export function ContentWithLinkPreview({
  content,
  onImageLinkClick,
  className = "",
}: ContentWithLinkPreviewProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const href = e.currentTarget.getAttribute("href")
      if (!href) return
      if (isImageUrl(href)) {
        e.preventDefault()
        onImageLinkClick(href)
      }
      // Se não for imagem, o <a target="_blank"> trata de abrir noutra aba
    },
    [onImageLinkClick]
  )

  if (!content.trim()) {
    return <p className={className}>Sem conteúdo.</p>
  }

  const parts: { type: "text" | "url"; value: string }[] = []
  let lastIndex = 0
  let m: RegExpExecArray | null
  const re = new RegExp(URL_REGEX.source, "gi")
  while ((m = re.exec(content)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, m.index) })
    }
    parts.push({ type: "url", value: m[0] })
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) })
  }
  if (parts.length === 0) {
    parts.push({ type: "text", value: content })
  }

  return (
    <div className={`whitespace-pre-wrap break-words text-sm ${className}`}>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.value}</span>
        }
        const url = part.value
        const isImage = isImageUrl(url)
        return (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="text-[var(--aw-accent)] underline hover:opacity-90"
            title={isImage ? "Ver imagem" : "Abrir link"}
          >
            {url}
          </a>
        )
      })}
    </div>
  )
}
