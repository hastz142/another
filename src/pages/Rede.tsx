import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Wifi,
  Shield,
  Gauge,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Server,
  Globe,
  Copy,
  Trash2,
  Activity,
  HelpCircle,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useNetwork } from "@/contexts/NetworkContext"
import { cn } from "@/lib/utils"
import type { NetworkStatus } from "@/contexts/NetworkContext"

/** Legenda dos endpoints da API: significado e exemplos reais do fluxo de rede. */
const API_REQUEST_LEGEND: Array<{
  pattern: string | RegExp
  name: string
  description: string
  when: string
  example: string
}> = [
  {
    pattern: "/api/ping",
    name: "Ping (servidor)",
    description: "Mede a latência até ao teu backend e confirma se o servidor está a responder.",
    when: "Automático a cada 30 s e ao carregar a app (página Rede / NetworkProvider).",
    example: "GET /api/ping → 200 { ok: true, ts: 1234567890 }",
  },
  {
    pattern: "/api/ping-external",
    name: "Ping (internet)",
    description: "O servidor faz um pedido a um site externo (Google) para saber se a internet está acessível. Distingue «servidor fora» de «internet fora».",
    when: "Em paralelo com /api/ping, a cada 30 s e no arranque.",
    example: "GET /api/ping-external → 200 { ok: true }. O backend por sua vez chama https://www.google.com/generate_204",
  },
  {
    pattern: "/api/health",
    name: "Health (diagnóstico)",
    description: "Confirma se o backend está no ar e se DATABASE_URL e ENCRYPTION_KEY estão definidas (sem revelar valores).",
    when: "Quando clicas em «Verificar servidor» na página Senhas.",
    example: "GET /api/health → 200 { ok: true, databaseUrlDefinida: true, encryptionKeyDefinida: true }",
  },
  {
    pattern: /^\/api\/senhas\/\d+$/,
    name: "Atualizar / Apagar senha",
    description: "Atualiza (PUT) ou apaga (DELETE) um registo de senha pelo ID.",
    when: "Ao guardar alterações (PUT) ou ao confirmar eliminação (DELETE) na página Senhas.",
    example: "PUT /api/senhas/42 → 200 { id, categoria, ... }  |  DELETE /api/senhas/42 → 204",
  },
  {
    pattern: "/api/senhas",
    name: "Listar senhas",
    description: "Devolve todas as senhas guardadas, já descriptografadas. A chave de criptografia fica só no servidor.",
    when: "Ao abrir a página Senhas e após criar/editar/apagar um registo (refresh da lista).",
    example: "GET /api/senhas → 200 [ { id, categoria, servico, usuario, senha, grupo }, ... ]",
  },
  {
    pattern: "/api/network-log",
    name: "Network log (opcional)",
    description: "Endpoint para o front enviar eventos de rede (timestamp, status, latência) para observabilidade no servidor.",
    when: "Se alguma parte da app chamar POST /api/network-log (hoje não usado por defeito).",
    example: "POST /api/network-log → 204 (body: { timestamp, status, ... })",
  },
]

function getRequestLegendEntry(url: string): (typeof API_REQUEST_LEGEND)[number] | undefined {
  const path = url.replace(window.location.origin, "").split("?")[0]
  return API_REQUEST_LEGEND.find((entry) => {
    if (typeof entry.pattern === "string") return path === entry.pattern || path.startsWith(entry.pattern)
    return entry.pattern.test(path)
  })
}

const STATUS_LABEL: Record<NetworkStatus, string> = {
  ok: "Conexão estável",
  slow: "Latência alta",
  unstable: "Conexão instável",
  offline: "Sem conexão",
  server: "Servidor fora do ar",
}

function getPerfSummary(): { loadMs: number | null; domReadyMs: number | null } {
  if (typeof performance === "undefined" || !performance.getEntriesByType) {
    return { loadMs: null, domReadyMs: null }
  }
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
  if (!nav) return { loadMs: null, domReadyMs: null }
  const loadMs = nav.loadEventEnd > 0 ? Math.round(nav.loadEventEnd - nav.fetchStart) : null
  const domReadyMs = nav.domContentLoadedEventEnd > 0 ? Math.round(nav.domContentLoadedEventEnd - nav.fetchStart) : null
  return { loadMs, domReadyMs }
}

function buildDiagnosticText(ctx: ReturnType<typeof useNetwork>): string {
  const lines: string[] = [
    "--- Network Debug ---",
    "",
    `Status: ${ctx.status.toUpperCase()}`,
    `Internet: ${ctx.lastInternetOk ? "OK" : "Falha"}`,
    `Servidor: ${ctx.lastServerOk ? "OK" : "Falha"}`,
    `Latência média: ${ctx.avgLatencyMs ?? "—"} ms`,
    `Oscilação (jitter): ${ctx.jitterMs ?? "—"} ms`,
    `Perda de pacotes: ${ctx.packetLossPct ?? "—"}%`,
    `Protocolo: ${ctx.isSecure ? "HTTPS" : "HTTP"}`,
    `Última verificação: ${ctx.lastCheckAt ? new Date(ctx.lastCheckAt).toLocaleString("pt-BR") : "—"}`,
    "",
  ]
  const failed = ctx.requestLog.filter((r) => r.status != null && r.status >= 400)
  if (failed.length > 0) {
    lines.push("Requests com erro:")
    failed.slice(-10).forEach((r) => lines.push(`  ${r.method} ${r.url} → ${r.status ?? "erro"}`))
    lines.push("")
  }
  lines.push(`Browser: ${navigator.userAgent.slice(0, 60)}...`)
  lines.push(`Plataforma: ${navigator.platform}`)
  lines.push(`Idioma: ${navigator.language}`)
  lines.push(`Online: ${navigator.onLine}`)
  return lines.join("\n")
}

export function Rede() {
  const ctx = useNetwork()
  const {
    status,
    lastLatencyMs,
    lastCheckAt,
    isSecure,
    avgLatencyMs,
    packetLossPct,
    jitterMs,
    lastServerOk,
    lastInternetOk,
    connectionInfo,
    pingHistory,
    requestLog,
    triggerCheck,
    clearRequestLog,
  } = ctx
  const [testing, setTesting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showRequestLegend, setShowRequestLegend] = useState(false)
  const perf = useMemo(getPerfSummary, [])

  const handleTest = async () => {
    setTesting(true)
    await triggerCheck()
    setTesting(false)
  }

  const handleCopyDiagnostic = async () => {
    const text = buildDiagnosticText(ctx)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const chartData = useMemo(
    () =>
      pingHistory.map((e, i) => ({
        index: i + 1,
        ms: e.ok && e.latencyMs != null ? e.latencyMs : 0,
        label: `#${i + 1}`,
      })),
    [pingHistory]
  )

  const statusColor =
    status === "ok"
      ? "text-[var(--aw-positive)]"
      : status === "slow" || status === "unstable"
        ? "text-amber-500"
        : "text-[var(--aw-danger)]"

  const diagnoses = useMemo(() => {
    const list: string[] = []
    if (status === "ok" && lastServerOk && lastInternetOk) {
      list.push("✔ Conexão saudável")
      list.push("✔ Servidor a responder normalmente")
      list.push("✔ Latência dentro do esperado")
    } else {
      if (!lastServerOk && !lastInternetOk) {
        list.push("⚠ Servidor inacessível (backend parado ou sem rede). Use npm run dev:all para subir o backend.")
      } else {
        if (!lastInternetOk) list.push("⚠ Sem acesso à internet")
        if (!lastServerOk && lastInternetOk) list.push("⚠ Servidor não está a responder")
      }
      if (status === "slow") list.push("⚠ Latência elevada")
      if (status === "unstable") list.push("⚠ Oscilação de rede alta")
      if ((packetLossPct ?? 0) > 0) list.push(`⚠ Perda de pacotes: ${packetLossPct}%`)
    }
    return list
  }, [status, lastServerOk, lastInternetOk, packetLossPct])

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--aw-text)]">
              DevTools de Rede
            </h1>
            <p className="mt-1 text-sm text-[var(--aw-text-muted)]">
              Status da conexão, latência, requests da API e desempenho. Monitor em segundo plano em todo o site.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleCopyDiagnostic} className="gap-1.5">
              <Copy className="size-4" />
              {copied ? "Copiado!" : "Copiar diagnóstico"}
            </Button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="size-5" />
                Status da Conexão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-[var(--aw-text-muted)]">Internet</span>
                <span className={cn("font-medium", lastInternetOk ? "text-[var(--aw-positive)]" : "text-[var(--aw-danger)]")}>
                  {lastInternetOk ? "🟢 Conectado" : "🔴 Sem acesso"}
                </span>
                <span className="text-[var(--aw-text-muted)]">Servidor</span>
                <span className={cn("font-medium", lastServerOk ? "text-[var(--aw-positive)]" : "text-[var(--aw-danger)]")}>
                  {lastServerOk ? "🟢 A responder" : "🔴 Fora do ar"}
                </span>
                <span className="text-[var(--aw-text-muted)]">Protocolo</span>
                <span className="font-medium text-[var(--aw-text)]">{isSecure ? "HTTPS" : "HTTP"}</span>
                <span className="text-[var(--aw-text-muted)]">Último teste</span>
                <span className="font-medium text-[var(--aw-text)]">
                  {lastCheckAt ? new Date(lastCheckAt).toLocaleTimeString("pt-BR") : "—"}
                </span>
                <span className="text-[var(--aw-text-muted)]">Latência média</span>
                <span className="font-medium text-[var(--aw-text)]">{avgLatencyMs != null ? `${avgLatencyMs} ms` : "—"}</span>
                <span className="text-[var(--aw-text-muted)]">Oscilação</span>
                <span className="font-medium text-[var(--aw-text)]">
                  {jitterMs != null ? (jitterMs < 200 ? "Baixa" : jitterMs < 500 ? "Média" : "Alta") : "—"}
                </span>
                <span className="text-[var(--aw-text-muted)]">Perda de pacotes</span>
                <span className="font-medium text-[var(--aw-text)]">{packetLossPct != null ? `${packetLossPct}%` : "—"}</span>
              </div>
              {connectionInfo && (connectionInfo.effectiveType || connectionInfo.downlinkMb != null) && (
                <div className="border-t border-[var(--aw-border)] pt-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--aw-text-muted)]">
                    Rede do dispositivo
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm text-[var(--aw-text)]">
                    {connectionInfo.effectiveType && (
                      <span>Tipo: {connectionInfo.effectiveType.toUpperCase()}</span>
                    )}
                    {connectionInfo.downlinkMb != null && (
                      <span>~{connectionInfo.downlinkMb} Mb/s</span>
                    )}
                    {connectionInfo.rttMs != null && (
                      <span>RTT: {connectionInfo.rttMs} ms</span>
                    )}
                  </div>
                </div>
              )}
              <p className={cn("flex items-center gap-2 text-sm font-medium", statusColor)}>
                {status === "ok" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                {STATUS_LABEL[status]}
              </p>
              {!lastServerOk && !lastInternetOk && (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                  Quando o backend não está a correr, os dois testes falham. Na raiz do projeto execute: <code className="rounded bg-[var(--aw-border)] px-1">npm run dev:all</code>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Gauge className="size-5" />
                Latência (últimos {pingHistory.length} testes)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {chartData.length > 0 && chartData.some((d) => d.ms > 0) ? (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--aw-border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--aw-text-muted)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--aw-text-muted)" }} unit=" ms" />
                      <Tooltip
                        contentStyle={{ background: "var(--aw-card)", border: "1px solid var(--aw-border)" }}
                        labelStyle={{ color: "var(--aw-text)" }}
                        formatter={(value: number) => [`${value} ms`, "Latência"]}
                      />
                      <Bar dataKey="ms" fill="var(--aw-accent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : chartData.length > 0 ? (
                <p className="py-8 text-center text-sm text-[var(--aw-text-muted)]">
                  Nenhum ping com sucesso. Confirme se o backend está a correr (<code className="rounded bg-[var(--aw-border)] px-1">npm run dev:all</code>).
                </p>
              ) : (
                <p className="py-8 text-center text-sm text-[var(--aw-text-muted)]">
                  Execute um teste para ver o gráfico.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Server className="size-5" />
                  Requests recentes (API)
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setShowRequestLegend((v) => !v)}
                  className={cn(
                    "rounded-md p-1.5 transition-colors",
                    showRequestLegend
                      ? "bg-[var(--aw-accent)]/15 text-[var(--aw-accent)]"
                      : "text-[var(--aw-text-muted)] hover:bg-[var(--aw-border)] hover:text-[var(--aw-text)]"
                  )}
                  title={showRequestLegend ? "Ocultar legenda" : "O que significa cada request? Ver legenda e exemplos"}
                  aria-expanded={showRequestLegend}
                >
                  <HelpCircle className="size-4" />
                </button>
              </div>
              {showRequestLegend && (
                <div
                  className="mt-3 overflow-hidden rounded-lg border border-[var(--aw-border)] bg-[var(--aw-bg)]/80 shadow-sm"
                  role="region"
                  aria-label="Legenda dos requests da API"
                >
                  <div className="border-b border-[var(--aw-border)] bg-[var(--aw-card)]/80 px-4 py-2.5">
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--aw-text-muted)]">
                      O que significa cada request
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--aw-text-muted)]">
                      Exemplos reais do processo de rede
                    </p>
                  </div>
                  <ul className="divide-y divide-[var(--aw-border)]/60 p-2">
                    {API_REQUEST_LEGEND.map((entry) => (
                      <li
                        key={entry.name}
                        className="px-3 py-3 first:pt-3 last:pb-3"
                      >
                        <span className="inline-block rounded-full bg-[var(--aw-accent)]/15 px-2.5 py-0.5 text-xs font-semibold text-[var(--aw-accent)]">
                          {entry.name}
                        </span>
                        <p className="mt-2 text-sm leading-snug text-[var(--aw-text)]">
                          {entry.description}
                        </p>
                        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-[var(--aw-text-muted)]">
                          <span className="mt-0.5 shrink-0 rounded bg-[var(--aw-border)]/60 px-1.5 py-0.5 font-medium text-[var(--aw-text-muted)]">
                            Quando
                          </span>
                          <span>{entry.when}</span>
                        </p>
                        <div className="mt-2 rounded-md border border-[var(--aw-border)]/80 bg-[var(--aw-card)]/50 px-3 py-2 font-mono text-[11px] leading-relaxed text-[var(--aw-accent)]">
                          {entry.example}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={clearRequestLog} className="gap-1 shrink-0">
              <Trash2 className="size-4" />
              Limpar
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {requestLog.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--aw-text-muted)]">
                Nenhum request à API ainda. Navegue pelo site para ver as chamadas.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <p className="mb-2 text-xs text-[var(--aw-text-muted)]">
                  Passa o rato sobre o endpoint para ver o que significa.
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--aw-border)] text-left text-[var(--aw-text-muted)]">
                      <th className="pb-2 pr-4 font-medium">Endpoint</th>
                      <th className="pb-2 pr-4 font-medium">Método</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 font-medium">Tempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...requestLog].reverse().slice(0, 15).map((r) => {
                      const legend = getRequestLegendEntry(r.url)
                      const tooltipText = legend
                        ? `${legend.name}: ${legend.description} Quando: ${legend.when} Ex.: ${legend.example}`
                        : "Request à API do backend (proxy para localhost:3001)"
                      return (
                        <tr key={r.id} className="border-b border-[var(--aw-border)]/50">
                          <td
                            className="py-1.5 pr-4 font-mono text-xs text-[var(--aw-text)] cursor-help"
                            title={tooltipText}
                          >
                            {r.url}
                          </td>
                          <td className="py-1.5 pr-4 text-[var(--aw-text-muted)]">{r.method}</td>
                          <td className="py-1.5 pr-4">
                            <span
                              className={cn(
                                r.status != null && r.status >= 400 ? "text-[var(--aw-danger)]" : "text-[var(--aw-text)]"
                              )}
                            >
                              {r.status ?? "erro"}
                            </span>
                          </td>
                          <td className="py-1.5 text-[var(--aw-text-muted)]">{r.durationMs} ms</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Performance do sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--aw-text-muted)]">Carregamento da página</span>
                <span className="text-[var(--aw-text)]">{perf.loadMs != null ? `${(perf.loadMs / 1000).toFixed(2)} s` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--aw-text-muted)]">DOM pronto</span>
                <span className="text-[var(--aw-text)]">{perf.domReadyMs != null ? `${perf.domReadyMs} ms` : "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Diagnóstico automático</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1 text-sm text-[var(--aw-text)]">
                {diagnoses.length > 0 ? (
                  diagnoses.map((d, i) => <li key={i}>{d}</li>)
                ) : (
                  <li className="text-[var(--aw-text-muted)]">Aguardando dados…</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ferramentas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testing} className="gap-1.5">
              <RefreshCw className={cn("size-4", testing && "animate-spin")} />
              {testing ? "A testar…" : "Testar conexão"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testing} className="gap-1.5">
              <Globe className="size-4" />
              Testar API
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                if ("caches" in window) {
                  const names = await caches.keys()
                  await Promise.all(names.map((n) => caches.delete(n)))
                }
                window.location.reload()
              }}
            >
              <Trash2 className="size-4" />
              Limpar cache e recarregar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detalhes técnicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0 font-mono text-xs text-[var(--aw-text-muted)]">
            <p>
              <span className="text-[var(--aw-text)]">User Agent:</span> {navigator.userAgent.slice(0, 70)}…
            </p>
            <p>
              <span className="text-[var(--aw-text)]">Plataforma:</span> {navigator.platform}
            </p>
            <p>
              <span className="text-[var(--aw-text)]">Idioma:</span> {navigator.language}
            </p>
            <p>
              <span className="text-[var(--aw-text)]">Online:</span> {String(navigator.onLine)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
