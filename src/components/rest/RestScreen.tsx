"use client"

import { useCallback, useEffect } from "react"
import { useOptionalRestScreen } from "@/contexts/RestScreenContext"
import { Coffee } from "lucide-react"
import { RestScreenPixelBat } from "./RestScreenPixelBat"

/**
 * Tela de descanso em fullscreen.
 * Dismiss: clique ou qualquer tecla.
 * Conteúdo e estilo vêm de config (fácil de estender depois).
 */
export function RestScreen() {
  const ctx = useOptionalRestScreen()
  if (!ctx) return null
  const { show, setShow, config } = ctx

  const dismiss = useCallback(() => setShow(false), [setShow])

  useEffect(() => {
    if (!show) return
    const onKeyDown = () => dismiss()
    const onPointerDown = () => dismiss()
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("pointerdown", onPointerDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("pointerdown", onPointerDown)
    }
  }, [show, dismiss])

  if (!show) return null

  const hasBackgroundImage = !!config.backgroundImage?.startsWith("data:image/")

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center ${hasBackgroundImage ? "" : "bg-[var(--aw-bg)]/95 backdrop-blur-sm"}`}
      role="dialog"
      aria-label="Tela de descanso"
      aria-modal="true"
      style={
        hasBackgroundImage
          ? {
              backgroundImage: `url(${config.backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <div
        className={
          hasBackgroundImage
            ? "flex flex-col items-center justify-center gap-6 px-6 text-center rounded-2xl bg-[var(--aw-bg)]/90 backdrop-blur-md py-10 shadow-xl"
            : "flex flex-col items-center gap-6 px-6 text-center"
        }
      >
        {config.showPixelMascot ? (
          <RestScreenPixelBat />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--aw-border)]/40 text-[var(--aw-text-muted)]">
            <Coffee className="size-10" strokeWidth={1.5} />
          </div>
        )}
        <div>
          <h2 className="text-2xl font-semibold text-[var(--aw-text)]">
            {config.title}
          </h2>
          <p className="mt-2 text-sm text-[var(--aw-text-muted)]">
            {config.dismissHint}
          </p>
        </div>
      </div>
    </div>
  )
}
