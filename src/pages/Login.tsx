import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"

function useRedirectTarget() {
  const location = useLocation()
  return useMemo(() => {
    const params = new URLSearchParams(location.search)
    const redirect = params.get("redirect")
    return redirect && redirect.startsWith("/") ? redirect : "/financeiro"
  }, [location.search])
}

export default function Login() {
  const navigate = useNavigate()
  const redirectTo = useRedirectTarget()
  const { theme, toggleTheme } = useTheme()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) navigate(redirectTo, { replace: true })
    })
  }, [navigate, redirectTo])

  async function signInWithPassword() {
    setStatus(null)
    setIsLoading(true)
    try {
      const res = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (res.error) throw res.error
      navigate(redirectTo, { replace: true })
    } catch (e: unknown) {
      const err = e as { message?: string; status?: number; error_description?: string }
      // Log completo para debug (ex.: 500 no Auth)
      console.error("[Login] signInWithPassword erro:", e)
      setStatus(err?.error_description ?? err?.message ?? "Falha ao entrar.")
    } finally {
      setIsLoading(false)
    }
  }

  async function signUp() {
    setStatus(null)
    setIsLoading(true)
    try {
      const res = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (res.error) throw res.error
      setStatus("Conta criada. Se o Supabase exigir confirmação, verifique seu e-mail.")
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Falha ao criar conta.")
    } finally {
      setIsLoading(false)
    }
  }

  async function sendMagicLink() {
    setStatus(null)
    setIsLoading(true)
    try {
      const res = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin + redirectTo,
        },
      })
      if (res.error) throw res.error
      setStatus("Link enviado. Verifique seu e-mail para entrar.")
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Falha ao enviar link.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--aw-bg)] p-6">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-[var(--aw-text)]">Entrar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {status && (
              <div className="rounded-lg border border-[var(--aw-border)] bg-[var(--aw-card)] px-3 py-2 text-sm text-[var(--aw-text)]">
                {status}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--aw-text)]">E-mail</label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--aw-text)]">Senha</label>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="grid gap-2">
              <Button type="button" onClick={signInWithPassword} disabled={isLoading}>
                {isLoading ? "Aguarde…" : "Entrar com senha"}
              </Button>
              <Button type="button" variant="outline" onClick={sendMagicLink} disabled={isLoading}>
                Enviar link mágico
              </Button>
              <Button type="button" variant="ghost" onClick={signUp} disabled={isLoading}>
                Criar conta
              </Button>
            </div>

            <p className="text-xs text-[var(--aw-text-muted)]">
              Depois de entrar, você será redirecionado para <span className="font-medium text-[var(--aw-text)]">{redirectTo}</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

