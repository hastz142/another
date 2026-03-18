import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

type ImagePreviewModalProps = {
  imageUrl: string | null
  open: boolean
  onClose: () => void
}

/** Pop-up para visualizar imagem ao clicar num link de imagem no texto da nota. */
export function ImagePreviewModal({ imageUrl, open, onClose }: ImagePreviewModalProps) {
  const [error, setError] = useState(false)

  useEffect(() => {
    if (open && imageUrl) setError(false)
  }, [open, imageUrl])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (open) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Visualização da imagem"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative max-h-[90vh] max-w-[90vw] rounded-lg bg-[var(--aw-card)] shadow-xl">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 z-10 rounded-full bg-black/50 text-white hover:bg-black/70"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X className="size-5" />
        </Button>
        <div className="p-2">
          {imageUrl && !error ? (
            <img
              src={imageUrl}
              alt="Visualização"
              className="max-h-[85vh] max-w-full rounded object-contain"
              onError={() => setError(true)}
            />
          ) : (
            <div className="flex min-h-[200px] min-w-[280px] flex-col items-center justify-center gap-2 rounded border border-[var(--aw-border)] bg-[var(--aw-bg)] p-6 text-center text-sm text-[var(--aw-text-muted)]">
              {error || !imageUrl
                ? "Não foi possível carregar a imagem."
                : "A carregar…"}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
