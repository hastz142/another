import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import type { Session } from "@supabase/supabase-js"

type Kind = "entrada" | "saida"

type Category = {
  id: string
  name: string
  kind: Kind
}

type Tx = {
  id: string
  kind: Kind
  amount: number
  description: string | null
  transaction_date: string
  category_id: string | null
  category_name: string
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function formatDateLocalISO(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

function currencyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value)
}

/** Converte string pt-BR (ex: 1.234,56) para número */
function parseAmountBR(value: string): number {
  return Number(
    String(value)
      .replace(/\./g, "")
      .replace(",", ".")
  )
}

/** Formata valor numérico para exibição no input (2 casas decimais, vírgula) */
function formatAmountInput(value: string): string {
  if (!value.trim()) return ""
  const parsed = parseAmountBR(value)
  if (!Number.isFinite(parsed) || parsed < 0) return value
  return parsed.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function Financeiro() {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [month, setMonth] = useState(() => new Date())

  const [kind, setKind] = useState<Kind>("saida")
  const [amount, setAmount] = useState<string>("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [transactionDate, setTransactionDate] = useState<string>(() =>
    formatDateLocalISO(new Date())
  )

  const [newCategoryName, setNewCategoryName] = useState<string>("")
  const [categories, setCategories] = useState<Category[]>([])
  const [txs, setTxs] = useState<Tx[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingTxId, setEditingTxId] = useState<string | null>(null)

  const monthRange = useMemo(() => {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    return { start, end }
  }, [month])

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session ?? null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!isMounted) return
      setSession(next)
    })

    return () => {
      isMounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) return
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setStatus(null)
      try {
        const [catsRes, txRes] = await Promise.all([
          supabase
            .from("categories")
            .select("id, name, kind")
            .order("name", { ascending: true }),
          supabase
            .from("transactions")
            .select("id, kind, amount, description, transaction_date, category_id")
            .gte("transaction_date", formatDateLocalISO(monthRange.start))
            .lte("transaction_date", formatDateLocalISO(monthRange.end))
            .order("transaction_date", { ascending: false })
            .order("created_at", { ascending: false }),
        ])

        if (cancelled) return
        if (catsRes.error) throw catsRes.error
        if (txRes.error) throw txRes.error

        const cats = (catsRes.data ?? []) as Category[]
        const txRaw = (txRes.data ?? []) as Array<{
          id: string
          kind: Kind
          amount: number
          description: string | null
          transaction_date: string
          category_id: string | null
        }>

        const catMap = new Map(cats.map((c) => [c.id, c.name]))
        const txMapped: Tx[] = txRaw.map((t) => ({
          ...t,
          category_name: t.category_id ? catMap.get(t.category_id) ?? "Sem categoria" : "Sem categoria",
        }))

        setCategories(cats)
        setTxs(txMapped)
      } catch (e: unknown) {
        setStatus(
          e instanceof Error
            ? e.message
            : "Não foi possível carregar o Financeiro."
        )
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [session?.user, monthRange.start, monthRange.end])

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.kind === kind)
  }, [categories, kind])

  const summary = useMemo(() => {
    let totalEntrada = 0
    let totalSaida = 0

    for (const t of txs) {
      if (t.kind === "entrada") totalEntrada += Number(t.amount) || 0
      else totalSaida += Number(t.amount) || 0
    }

    const saldo = totalEntrada - totalSaida

    const spendingByCategory = new Map<string, number>()
    for (const t of txs) {
      if (t.kind !== "saida") continue
      const key = t.category_name || "Sem categoria"
      spendingByCategory.set(key, (spendingByCategory.get(key) ?? 0) + (Number(t.amount) || 0))
    }

    const chartData = Array.from(spendingByCategory.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    return { totalEntrada, totalSaida, saldo, chartData }
  }, [txs])

  async function handleCreateCategory() {
    const name = newCategoryName.trim()
    if (!name) return
    if (!session?.user) return

    setStatus(null)
    setIsLoading(true)
    try {
      const res = await supabase
        .from("categories")
        .insert({
          user_id: session.user.id,
          name,
          kind,
        })
        .select("id, name, kind")
        .single()

      if (res.error) throw res.error

      const created = res.data as Category
      setCategories((prev) => {
        const next = [...prev, created].sort((a, b) =>
          a.name.localeCompare(b.name, "pt-BR")
        )
        return next
      })
      setCategoryId(created.id)
      setNewCategoryName("")
    } catch (e: unknown) {
      setStatus(
        e instanceof Error ? e.message : "Não foi possível criar categoria."
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddTransaction() {
    if (!session?.user) return

    const parsed = parseAmountBR(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setStatus("Informe um valor válido (maior que zero).")
      return
    }

    setStatus(null)
    setIsLoading(true)
    try {
      const res = await supabase
        .from("transactions")
        .insert({
          user_id: session.user.id,
          kind,
          amount: parsed,
          category_id: categoryId || null,
          description: description.trim() || null,
          transaction_date: transactionDate,
        })
        .select("id, kind, amount, description, transaction_date, category_id")
        .single()

      if (res.error) throw res.error

      const createdRaw = res.data as {
        id: string
        kind: Kind
        amount: number
        description: string | null
        transaction_date: string
        category_id: string | null
      }

      const catName =
        createdRaw.category_id
          ? categories.find((c) => c.id === createdRaw.category_id)?.name ??
            "Sem categoria"
          : "Sem categoria"

      const created: Tx = { ...createdRaw, category_name: catName }
      setTxs((prev) => [created, ...prev])

      setAmount("")
      setDescription("")
      setCategoryId("")
      setTransactionDate(formatDateLocalISO(new Date()))
    } catch (e: unknown) {
      setStatus(
        e instanceof Error ? e.message : "Não foi possível salvar transação."
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleEditTransaction(t: Tx) {
    setEditingTxId(t.id)
    setKind(t.kind)
    setAmount(
      (Number(t.amount) || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    )
    setCategoryId(t.category_id ?? "")
    setDescription(t.description ?? "")
    setTransactionDate(t.transaction_date)
    setStatus(null)
  }

  function handleCancelEdit() {
    setEditingTxId(null)
    setAmount("")
    setDescription("")
    setCategoryId("")
    setTransactionDate(formatDateLocalISO(new Date()))
    setStatus(null)
  }

  async function handleUpdateTransaction() {
    if (!session?.user || !editingTxId) return

    const parsed = parseAmountBR(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setStatus("Informe um valor válido (maior que zero).")
      return
    }

    setStatus(null)
    setIsLoading(true)
    try {
      const res = await supabase
        .from("transactions")
        .update({
          kind,
          amount: parsed,
          category_id: categoryId || null,
          description: description.trim() || null,
          transaction_date: transactionDate,
        })
        .eq("id", editingTxId)
        .eq("user_id", session.user.id)
        .select("id, kind, amount, description, transaction_date, category_id")
        .single()

      if (res.error) throw res.error

      const updatedRaw = res.data as {
        id: string
        kind: Kind
        amount: number
        description: string | null
        transaction_date: string
        category_id: string | null
      }

      const catName =
        updatedRaw.category_id
          ? categories.find((c) => c.id === updatedRaw.category_id)?.name ??
            "Sem categoria"
          : "Sem categoria"

      const updated: Tx = { ...updatedRaw, category_name: catName }
      setTxs((prev) =>
        prev.map((tx) => (tx.id === editingTxId ? updated : tx))
      )
      handleCancelEdit()
    } catch (e: unknown) {
      setStatus(
        e instanceof Error ? e.message : "Não foi possível atualizar transação."
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteTransaction(txId: string) {
    if (!session?.user) return
    if (!window.confirm("Excluir esta transação?")) return

    setIsLoading(true)
    setStatus(null)
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", txId)
        .eq("user_id", session.user.id)

      if (error) throw error

      setTxs((prev) => prev.filter((t) => t.id !== txId))
      if (editingTxId === txId) handleCancelEdit()
    } catch (e: unknown) {
      setStatus(
        e instanceof Error ? e.message : "Não foi possível excluir transação."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const monthText = monthLabel(month)

  if (!session?.user) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[var(--aw-text-muted)]">
              <p>
                Para usar o Financeiro, você precisa estar autenticado no Supabase
                (Auth).
              </p>
              <p className="text-xs text-[var(--aw-text-muted)]">
                Dica: configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no
                seu `.env` (veja `.env.example`), e depois implemente uma tela de
                login quando quiser.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--aw-bg)] p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--aw-text)]">Financeiro</h1>
            <p className="mt-1 text-sm text-[var(--aw-text-muted)]">
              Controle de entradas e saídas por mês.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-[var(--aw-border)] bg-[var(--aw-card)] px-3 py-2 shadow-sm">
            <Calendar className="size-4 text-[var(--aw-text-muted)]" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
              }
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[160px] text-center text-sm font-medium capitalize text-[var(--aw-text)]">
              {monthText}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
              }
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {status && (
          <div className="rounded-lg border border-[var(--aw-danger)]/30 bg-[var(--aw-danger)]/10 px-4 py-3 text-sm text-[var(--aw-danger)]">
            {status}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[var(--aw-text-muted)]">Saldo</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div
                className={cn(
                  "text-2xl font-semibold",
                  summary.saldo >= 0 ? "text-[var(--aw-positive)]" : "text-[var(--aw-danger)]"
                )}
              >
                {currencyBRL(summary.saldo)}
              </div>
              <p className="mt-1 text-xs text-[var(--aw-text-muted)]">Entradas - saídas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[var(--aw-text-muted)]">Entradas</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-[var(--aw-text)]">
                {currencyBRL(summary.totalEntrada)}
              </div>
              <p className="mt-1 text-xs text-[var(--aw-text-muted)]">Total no mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[var(--aw-text-muted)]">Saídas</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-[var(--aw-text)]">
                {currencyBRL(summary.totalSaida)}
              </div>
              <p className="mt-1 text-xs text-[var(--aw-text-muted)]">Total no mês</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Nova transação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[var(--aw-text)]">Tipo</label>
                <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-[var(--aw-text)]">Valor</label>
                <Input
                  inputMode="decimal"
                  placeholder="Ex: 29,90"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => {
                    if (amount.trim()) setAmount(formatAmountInput(amount))
                  }}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-[var(--aw-text)]">
                  Categoria
                </label>
                <Select
                  value={categoryId || "__none__"}
                  onValueChange={(v) => setCategoryId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem categoria</SelectItem>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="Nova categoria…"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    onClick={handleCreateCategory}
                    disabled={isLoading}
                  >
                    <Plus className="size-4" />
                    Criar
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-[var(--aw-text)]">
                  Descrição
                </label>
                <Input
                  placeholder="Ex: Uber centro → casa"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-[var(--aw-text)]">Data</label>
                <Input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                {editingTxId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={
                    editingTxId ? handleUpdateTransaction : handleAddTransaction
                  }
                  disabled={isLoading}
                  className={editingTxId ? "flex-1" : "w-full"}
                >
                  {isLoading
                    ? "Salvando…"
                    : editingTxId
                      ? "Atualizar transação"
                      : "Salvar transação"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Gastos por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                {summary.chartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[var(--aw-border)] bg-[var(--aw-card)] text-sm text-[var(--aw-text-muted)]">
                    Sem dados de saída neste mês.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--aw-border)"
                      />
                      <XAxis dataKey="name" className="text-xs" stroke="var(--aw-text-muted)" />
                      <YAxis className="text-xs" stroke="var(--aw-text-muted)" />
                      <Tooltip
                        formatter={(v) => currencyBRL(Number(v))}
                        contentStyle={{
                          backgroundColor: "var(--aw-card)",
                          border: "1px solid var(--aw-border)",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "var(--aw-text)" }}
                      />
                      <Bar
                        dataKey="value"
                        fill="var(--aw-accent)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && txs.length === 0 ? (
              <div className="text-sm text-[var(--aw-text-muted)]">Carregando…</div>
            ) : txs.length === 0 ? (
              <div className="text-sm text-[var(--aw-text-muted)]">
                Nenhuma transação no período.
              </div>
            ) : (
              <div className="divide-y divide-[var(--aw-border)] rounded-lg border border-[var(--aw-border)] bg-[var(--aw-card)]">
                {txs.slice(0, 30).map((t) => {
                  const isSaida = t.kind === "saida"
                  return (
                    <div
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              isSaida
                                ? "bg-[var(--aw-danger)]/20 text-[var(--aw-danger)]"
                                : "bg-[var(--aw-positive)]/20 text-[var(--aw-positive)]"
                            )}
                          >
                            {isSaida ? "Saída" : "Entrada"}
                          </span>
                          <span className="truncate text-sm font-medium text-[var(--aw-text)]">
                            {t.category_name}
                          </span>
                        </div>
                        {t.description && (
                          <div className="mt-0.5 truncate text-sm text-[var(--aw-text-muted)]">
                            {t.description}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-[var(--aw-text-muted)] hover:text-[var(--aw-text)]"
                          onClick={() => handleEditTransaction(t)}
                          disabled={isLoading}
                          title="Editar"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-[var(--aw-text-muted)] hover:text-[var(--aw-danger)]"
                          onClick={() => handleDeleteTransaction(t.id)}
                          disabled={isLoading}
                          title="Excluir"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <div className="text-right">
                          <div
                            className={cn(
                              "text-sm font-semibold",
                              isSaida ? "text-[var(--aw-danger)]" : "text-[var(--aw-positive)]"
                            )}
                          >
                            {isSaida ? "-" : "+"}
                            {currencyBRL(Number(t.amount) || 0)}
                          </div>
                          <div className="text-xs text-[var(--aw-text-muted)]">
                            {new Date(t.transaction_date).toLocaleDateString(
                              "pt-BR"
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

