/**
 * Configuração da tela de descanso.
 * Fácil de acessar e alterar; no futuro: o que exibir, como exibir, etc.
 */

const STORAGE_KEY = "another-world-rest-screen"

/** Dimensões mínimas recomendadas para a imagem de fundo (evitar ficar pixelada). */
export const REST_SCREEN_IMAGE_MIN_WIDTH = 1280
export const REST_SCREEN_IMAGE_MIN_HEIGHT = 720

/** Tamanho máximo do ficheiro em bytes (evitar encher sessionStorage). */
export const REST_SCREEN_IMAGE_MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export interface RestScreenConfig {
  /** Minutos sem atividade para mostrar a tela automaticamente. */
  idleMinutes: number
  /** Atalho para forçar a tela (ex.: "Alt+P"). */
  shortcut: string
  /** Mensagem principal na tela (futuro: personalizável). */
  title: string
  /** Instrução para sair (futuro: personalizável). */
  dismissHint: string
  /** Ativar/desativar tela por inatividade. */
  enabled: boolean
  /** Imagem de fundo em data URL (base64). JPG, PNG, WebP. */
  backgroundImage: string | null
  /** Morceguinho em pixel art (CSS) no topo da tela. */
  showPixelMascot: boolean
}

const DEFAULT: RestScreenConfig = {
  idleMinutes: 5,
  shortcut: "Alt+P",
  title: "Pausa",
  dismissHint: "Clique ou pressione uma tecla para continuar",
  enabled: true,
  backgroundImage: null,
  showPixelMascot: true,
}

export function loadRestScreenConfig(): RestScreenConfig {
  if (typeof window === "undefined") return { ...DEFAULT }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT }
    const parsed = JSON.parse(raw) as Partial<RestScreenConfig>
    return {
      idleMinutes: Math.max(1, Math.min(120, Number(parsed.idleMinutes) ?? DEFAULT.idleMinutes)),
      shortcut: typeof parsed.shortcut === "string" ? parsed.shortcut : DEFAULT.shortcut,
      title: typeof parsed.title === "string" ? parsed.title : DEFAULT.title,
      dismissHint: typeof parsed.dismissHint === "string" ? parsed.dismissHint : DEFAULT.dismissHint,
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT.enabled,
      backgroundImage:
        typeof parsed.backgroundImage === "string" && parsed.backgroundImage.startsWith("data:image/")
          ? parsed.backgroundImage
          : null,
      showPixelMascot:
        typeof parsed.showPixelMascot === "boolean" ? parsed.showPixelMascot : DEFAULT.showPixelMascot,
    }
  } catch {
    return { ...DEFAULT }
  }
}

export function saveRestScreenConfig(config: RestScreenConfig): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // ignore
  }
}
