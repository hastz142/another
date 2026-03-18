import { useCallback, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i

/** Envolve parágrafos que começam com "Vantagem:" ou "Desvantagem:" em cards semânticos. */
function wrapSemanticCards(html: string): string {
  return html
    .replace(/<p>(\s*)Vantagem:([\s\S]*?)<\/p>/gi, '<div class="preview-card-vantagem"><p>$1Vantagem:$2</p></div>')
    .replace(/<p>(\s*)Desvantagem:([\s\S]*?)<\/p>/gi, '<div class="preview-card-desvantagem"><p>$1Desvantagem:$2</p></div>')
}

/** Expande blocos mascarados: div/span com data-content (base64) vira bloco <pre> com o texto decodificado. */
function expandMaskedBlocks(html: string): string {
  const re = /<(div|span)\s+[^>]*data-type="masked-block"[^>]*>[\s\S]*?<\/\1>/gi
  return html.replace(re, (block) => {
    const contentMatch = block.match(/data-content="([^"]*)"/)
    const dataAttr = contentMatch?.[1]
    if (!dataAttr) return block
    try {
      const text = atob(dataAttr)
      const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
      return `<div class="nota-masked-block nota-masked-block-expanded"><pre class="nota-masked-block-content">${escaped}</pre></div>`
    } catch {
      return block
    }
  })
}

function isImageUrl(url: string): boolean {
  const trimmed = url.trim()
  if (/^data:image\//i.test(trimmed)) return true
  try {
    const u = new URL(trimmed)
    return IMAGE_EXTENSIONS.test(u.pathname)
  } catch {
    return false
  }
}

type NotaPreviewProps = {
  html: string
  onImageLinkClick: (url: string) => void
  className?: string
}

export function NotaPreview({ html, onImageLinkClick, className = "" }: NotaPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a[href]")
      if (!target) return
      const href = (target as HTMLAnchorElement).getAttribute("href")
      if (!href) return
      if (isImageUrl(href)) {
        e.preventDefault()
        e.stopPropagation()
        onImageLinkClick(href)
      }
    },
    [onImageLinkClick]
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener("click", handleClick)
    return () => el.removeEventListener("click", handleClick)
  }, [handleClick])

  const trimmed = (html || "").trim()
  if (!trimmed || trimmed === "<p></p>") {
    return (
      <div className={cn("text-sm text-[var(--aw-text-muted)]", className)}>
        Sem conteúdo. A pré-visualização aparece aqui.
      </div>
    )
  }

  const withCards = wrapSemanticCards(trimmed)
  const withExpandedMasked = expandMaskedBlocks(withCards)

  return (
    <div
      ref={containerRef}
      className={cn("nota-preview-prose overflow-auto text-sm text-[var(--aw-text)]", className)}
      dangerouslySetInnerHTML={{ __html: withExpandedMasked }}
    />
  )
}

