import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Timer, Play, Pause, RotateCcw, Settings2, Coffee, X, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiGetPomodoroSettings, apiPutPomodoroSettings } from "@/lib/api"
import type { PomodoroSettingsApi } from "@/lib/api"

type Phase = "work" | "shortBreak" | "longBreak"

const PHASE_LABEL: Record<Phase, string> = {
  work: "Foco",
  shortBreak: "Pausa curta",
  longBreak: "Pausa longa",
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

const POMODORO_TIP =
  "A técnica Pomodoro é um método de gestão de tempo criado por Francesco Cirillo nos anos 80 para aumentar a produtividade e o foco. Consiste em trabalhar intensamente por 25 minutos, chamados de \"pomodoros\", seguidos por uma pausa curta de 5 minutos. A cada quatro ciclos, faz-se uma pausa mais longa de 15 a 30 minutos."

const DEFAULT_SETTINGS: PomodoroSettingsApi = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakAfterCycles: 4,
}

export function Pomodoro() {
  const [settings, setSettings] = useState<PomodoroSettingsApi>(DEFAULT_SETTINGS)
  const [phase, setPhase] = useState<Phase>("work")
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SETTINGS.workMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [cyclesCompleted, setCyclesCompleted] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showPomodoroTip, setShowPomodoroTip] = useState(false)
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseRef = useRef(phase)
  const cyclesRef = useRef(cyclesCompleted)
  const settingsRef = useRef(settings)
  phaseRef.current = phase
  cyclesRef.current = cyclesCompleted
  settingsRef.current = settings

  useEffect(() => {
    let cancelled = false
    apiGetPomodoroSettings()
      .then((data) => {
        if (cancelled) return
        setSettings(data)
        setSecondsLeft((prev) => (prev === DEFAULT_SETTINGS.workMinutes * 60 ? data.workMinutes * 60 : prev))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const getPhaseDuration = useCallback(
    (p: Phase): number => {
      if (p === "work") return settings.workMinutes * 60
      if (p === "shortBreak") return settings.shortBreakMinutes * 60
      return settings.longBreakMinutes * 60
    },
    [settings]
  )

  const startPhase = useCallback(
    (p: Phase) => {
      setPhase(p)
      setSecondsLeft(getPhaseDuration(p))
    },
    [getPhaseDuration]
  )


  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          if (intervalRef.current) clearInterval(intervalRef.current)
          const currentPhase = phaseRef.current
          const currentCycles = cyclesRef.current
          const currentSettings = settingsRef.current
          setTimeout(() => {
            if (currentPhase === "work") {
              const nextCycles = currentCycles + 1
              setCyclesCompleted(nextCycles)
              const useLongBreak = nextCycles > 0 && nextCycles % currentSettings.longBreakAfterCycles === 0
              setPopup({
                title: "Pausa",
                message: useLongBreak ? "Hora da pausa longa! Descança um pouco." : "Hora da pausa curta.",
              })
              startPhase(useLongBreak ? "longBreak" : "shortBreak")
            } else {
              setPopup({
                title: "Volta ao foco",
                message: "Pausa terminada. Próximo ciclo de trabalho!",
              })
              startPhase("work")
            }
          }, 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, startPhase])

  useEffect(() => {
    document.title = isRunning ? `${formatTime(secondsLeft)} — ${PHASE_LABEL[phase]}` : "Pomodoro — Another World"
    return () => {
      document.title = "Another World"
    }
  }, [isRunning, secondsLeft, phase])

  const handleStartPause = () => {
    if (secondsLeft === 0 && phase === "work") {
      setSecondsLeft(getPhaseDuration("work"))
    }
    setIsRunning((r) => !r)
  }

  const handleReset = () => {
    setIsRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    startPhase(phase)
  }

  const handleSaveSettings = useCallback(
    async (next: PomodoroSettingsApi) => {
      try {
        await apiPutPomodoroSettings(next)
        setSettings(next)
        setShowSettings(false)
        if (!isRunning) {
          setSecondsLeft(next.workMinutes * 60)
          setPhase("work")
        }
      } catch {
        // mantém estado atual
      }
    },
    [isRunning]
  )

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-2 flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-[var(--aw-text)]">Timer / Pomodoro</h1>
          <div className="group relative">
            <button
              type="button"
              onClick={() => setShowPomodoroTip((v) => !v)}
              className={cn(
                "rounded-full p-1 text-[var(--aw-text-muted)] hover:bg-[var(--aw-border)] hover:text-[var(--aw-text)] focus:outline-none focus:ring-2 focus:ring-[var(--aw-accent)]",
                showPomodoroTip && "bg-[var(--aw-accent)]/15 text-[var(--aw-accent)]"
              )}
              aria-label="O que é a técnica Pomodoro?"
              aria-expanded={showPomodoroTip}
            >
              <HelpCircle className="size-5" />
            </button>
            <div
              className={cn(
                "absolute left-0 top-full z-[15] mt-2 w-72 rounded-lg border border-[var(--aw-border)] bg-[var(--aw-card)] p-3 text-left text-sm shadow-lg",
                "hidden group-hover:block",
                showPomodoroTip && "block"
              )}
            >
              <p className="text-[var(--aw-text)]">{POMODORO_TIP}</p>
            </div>
          </div>
        </div>
        {showPomodoroTip && (
          <div
            className="fixed inset-0 z-[5]"
            aria-hidden="true"
            onClick={() => setShowPomodoroTip(false)}
          />
        )}
        <p className="mb-6 text-sm text-[var(--aw-text-muted)]">
          Ciclos de foco e pausa para produtividade. Após {settings.longBreakAfterCycles} ciclos de foco, a pausa longa é sugerida.
        </p>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <p
                className={cn(
                  "mb-2 text-sm font-medium uppercase tracking-wider",
                  phase === "work" ? "text-[var(--aw-accent)]" : "text-[var(--aw-positive)]"
                )}
              >
                {PHASE_LABEL[phase]}
              </p>
              <p className="text-6xl font-bold tabular-nums text-[var(--aw-text)]">
                {formatTime(secondsLeft)}
              </p>
              <div className="mt-6 flex gap-2">
                <Button
                  type="button"
                  onClick={handleStartPause}
                  className="gap-2"
                  size="lg"
                >
                  {isRunning ? (
                    <>
                      <Pause className="size-5" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="size-5" />
                      Iniciar
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={handleReset} className="gap-2" size="lg">
                  <RotateCcw className="size-5" />
                  Reiniciar
                </Button>
              </div>
              {phase === "work" && cyclesCompleted > 0 && (
                <p className="mt-4 text-xs text-[var(--aw-text-muted)]">
                  Ciclos concluídos: {cyclesCompleted}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings((s) => !s)}
            className="gap-2"
          >
            <Settings2 className="size-4" />
            {showSettings ? "Ocultar configurações" : "Configurações"}
          </Button>
        </div>

        {showSettings && (
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="size-5" />
                Configurações do timer
              </CardTitle>
              <p className="text-sm text-[var(--aw-text-muted)]">
                Ajusta as durações de cada fase. As alterações aplicam-se ao guardar.
              </p>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              <div className="rounded-lg border border-[var(--aw-border)] bg-[var(--aw-bg)]/50 p-4">
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--aw-text)]">
                  <Timer className="size-4" />
                  Tempo de foco
                </h3>
                <p className="mb-3 text-xs text-[var(--aw-text-muted)]">
                  Duração de cada ciclo de trabalho (minutos).
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={settings.workMinutes}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        workMinutes: Math.max(1, Math.min(60, Number(e.target.value) || 25)),
                      }))
                    }
                    className="w-20"
                  />
                  <span className="text-sm text-[var(--aw-text-muted)]">minutos</span>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--aw-border)] bg-[var(--aw-bg)]/50 p-4">
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--aw-text)]">
                  <Coffee className="size-4" />
                  Pausas
                </h3>
                <p className="mb-3 text-xs text-[var(--aw-text-muted)]">
                  Pausa curta após cada foco; pausa longa após vários ciclos.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--aw-text-muted)]">
                      Pausa curta
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={settings.shortBreakMinutes}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            shortBreakMinutes: Math.max(1, Math.min(30, Number(e.target.value) || 5)),
                          }))
                        }
                        className="w-20"
                      />
                      <span className="text-xs text-[var(--aw-text-muted)]">min</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--aw-text-muted)]">
                      Pausa longa
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        value={settings.longBreakMinutes}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            longBreakMinutes: Math.max(1, Math.min(60, Number(e.target.value) || 15)),
                          }))
                        }
                        className="w-20"
                      />
                      <span className="text-xs text-[var(--aw-text-muted)]">min</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-[var(--aw-text-muted)]">
                    Fazer pausa longa a cada quantos ciclos de foco?
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={2}
                      max={10}
                      value={settings.longBreakAfterCycles}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          longBreakAfterCycles: Math.max(2, Math.min(10, Number(e.target.value) || 4)),
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-xs text-[var(--aw-text-muted)]">ciclos</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => handleSaveSettings(settings)}>
                  Guardar configurações
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowSettings(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pop-up de notificação (sem som) */}
        {popup && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={popup.title}
            onClick={() => setPopup(null)}
          >
            <div
              className="w-full max-w-sm rounded-lg border border-[var(--aw-border)] bg-[var(--aw-card)] p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--aw-text)]">{popup.title}</h3>
                  <p className="mt-1 text-sm text-[var(--aw-text-muted)]">{popup.message}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setPopup(null)}
                  aria-label="Fechar"
                >
                  <X className="size-5" />
                </Button>
              </div>
              <Button type="button" className="mt-4 w-full" onClick={() => setPopup(null)}>
                OK
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
