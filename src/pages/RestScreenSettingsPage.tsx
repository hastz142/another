"use client"

import { useCallback, useRef, useState } from "react"
import { useRestScreen } from "@/contexts/RestScreenContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Coffee, Keyboard, ImagePlus, Trash2, AlertTriangle } from "lucide-react"
import {
  REST_SCREEN_IMAGE_MIN_WIDTH,
  REST_SCREEN_IMAGE_MIN_HEIGHT,
  REST_SCREEN_IMAGE_MAX_BYTES,
} from "@/config/restScreenConfig"

export function RestScreenSettingsPage() {
  const { config, setConfig, openRestScreen } = useRestScreen()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageWarning, setImageWarning] = useState<string | null>(null)

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      setImageWarning(null)
      if (!file) return
      if (!file.type.startsWith("image/")) {
        setImageWarning("Selecione um ficheiro de imagem (JPG, PNG ou WebP).")
        return
      }
      if (file.size > REST_SCREEN_IMAGE_MAX_BYTES) {
        setImageWarning(
          `A imagem é muito pesada (${(file.size / 1024 / 1024).toFixed(1)} MB). Use até 5 MB para evitar problemas.`
        )
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const img = new Image()
        img.onload = () => {
          const w = img.naturalWidth
          const h = img.naturalHeight
          if (w < REST_SCREEN_IMAGE_MIN_WIDTH || h < REST_SCREEN_IMAGE_MIN_HEIGHT) {
            setImageWarning(
              `A imagem é pequena (${w}×${h} px). Para melhor resultado use pelo menos ${REST_SCREEN_IMAGE_MIN_WIDTH}×${REST_SCREEN_IMAGE_MIN_HEIGHT} px, senão pode ficar pixelada ou pequena na tela.`
            )
          } else {
            setImageWarning(null)
          }
          setConfig((prev) => ({ ...prev, backgroundImage: dataUrl }))
        }
        img.onerror = () => setImageWarning("Não foi possível carregar a imagem.")
        img.src = dataUrl
      }
      reader.readAsDataURL(file)
    },
    [setConfig]
  )

  const removeImage = useCallback(() => {
    setConfig((prev) => ({ ...prev, backgroundImage: null }))
    setImageWarning(null)
  }, [setConfig])

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-semibold text-[var(--aw-text)]">
          <Coffee className="size-6 text-[var(--aw-accent)]" />
          Tela de descanso
        </h1>
        <p className="mb-6 text-sm text-[var(--aw-text-muted)]">
          Após um tempo sem usar o site, a tela de descanso aparece. Use o atalho para abrir manualmente.
        </p>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <Checkbox
                id="rest-pixel-mascot"
                checked={config.showPixelMascot}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, showPixelMascot: checked === true }))
                }
                className="mt-0.5"
              />
              <div>
                <label
                  htmlFor="rest-pixel-mascot"
                  className="cursor-pointer text-sm font-medium text-[var(--aw-text)]"
                >
                  Morceguinho pixel (animação CSS)
                </label>
                <p className="text-xs text-[var(--aw-text-muted)]">
                  Estilo pixel art com <code className="rounded bg-[var(--aw-border)]/50 px-1">box-shadow</code> e{" "}
                  <code className="rounded bg-[var(--aw-border)]/50 px-1">steps(1)</code>, como nos tutoriais. Desative para
                  voltar ao ícone de café.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Checkbox
                id="rest-enabled"
                checked={config.enabled}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, enabled: checked === true }))
                }
                className="mt-0.5"
              />
              <div>
                <label
                  htmlFor="rest-enabled"
                  className="cursor-pointer text-sm font-medium text-[var(--aw-text)]"
                >
                  Ativar tela por inatividade
                </label>
                <p className="text-xs text-[var(--aw-text-muted)]">
                  Mostrar a tela automaticamente após o tempo abaixo sem atividade.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="rest-idle" className="block text-sm font-medium text-[var(--aw-text)]">
                Minutos sem atividade
              </label>
              <Input
                id="rest-idle"
                type="number"
                min={1}
                max={120}
                value={config.idleMinutes}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(120, Number(e.target.value) || 5))
                  setConfig((prev) => ({ ...prev, idleMinutes: n }))
                }}
                className="w-24"
              />
              <p className="text-xs text-[var(--aw-text-muted)]">
                Após este número de minutos sem mover o rato/teclado, a tela aparece.
              </p>
            </div>

            <div className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-medium text-[var(--aw-text)]">
                <Keyboard className="size-4" />
                Atalho para abrir agora
              </span>
              <p className="text-sm text-[var(--aw-text-muted)]">
                <kbd className="rounded border border-[var(--aw-border)] bg-[var(--aw-card)] px-2 py-0.5 font-mono text-xs">
                  {config.shortcut}
                </kbd>
                {" "}— abre a tela de descanso mesmo antes dos {config.idleMinutes} minutos.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-[var(--aw-text)]">
                Imagem de fundo
              </label>
              <p className="text-xs text-[var(--aw-text-muted)]">
                JPG, PNG ou WebP. Recomendado: pelo menos {REST_SCREEN_IMAGE_MIN_WIDTH}×{REST_SCREEN_IMAGE_MIN_HEIGHT} px (senão pode ficar pequena ou pixelada). Máx. 5 MB.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageSelect}
              />
              {config.backgroundImage ? (
                <div className="space-y-2">
                  <div
                    className="relative aspect-video max-h-40 w-full overflow-hidden rounded-lg border border-[var(--aw-border)] bg-[var(--aw-bg)]"
                    style={{
                      backgroundImage: `url(${config.backgroundImage})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="size-4" />
                      Trocar imagem
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-[var(--aw-text-muted)] hover:text-[var(--aw-danger)]"
                      onClick={removeImage}
                    >
                      <Trash2 className="size-4" />
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="size-4" />
                  Anexar imagem
                </Button>
              )}
              {imageWarning && (
                <div className="flex gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-left text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                  <span>{imageWarning}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={openRestScreen}
        >
          <Coffee className="size-4" />
          Abrir tela de descanso agora
        </Button>
      </div>
    </div>
  )
}
