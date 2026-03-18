import { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Eye,
  EyeOff,
  Copy,
  KeyRound,
  Plus,
  Pencil,
  Trash2,
  Search,
  FolderOpen,
  LayoutGrid,
  Check,
  X,
  Mail,
  ChevronDown,
  ChevronUp,
  Filter,
  Camera,
  Briefcase,
  Gamepad2,
  Globe,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

/** Ícone por nome de serviço (identificação rápida). */
const SERVICO_ICONS: { key: string; Icon: LucideIcon }[] = [
  { key: "gmail", Icon: Mail },
  { key: "instagram", Icon: Camera },
  { key: "facebook", Icon: Globe },
  { key: "linkedin", Icon: Briefcase },
  { key: "jogo", Icon: Gamepad2 },
  { key: "email", Icon: Mail },
]
function getServiceIcon(servico: string): LucideIcon {
  const s = (servico || "").toLowerCase()
  const found = SERVICO_ICONS.find(({ key }) => s.includes(key))
  return found ? found.Icon : KeyRound
}

/** Classe CSS para tag de categoria (cores sutis). */
function getCategoriaTagClass(categoria: string): string {
  const c = (categoria || "").toLowerCase()
  if (c.includes("trabalho")) return "pw-tag-trabalho"
  if (c.includes("redes") || c.includes("social")) return "pw-tag-redes"
  if (c.includes("email") || c.includes("gmail")) return "pw-tag-email"
  if (c.includes("faculdade")) return "pw-tag-faculdade"
  if (c.includes("jogo")) return "pw-tag-jogos"
  return "pw-tag-outros"
}

const CATEGORIAS_PADRAO = ["Redes Sociais", "Faculdade", "Trabalho", "Outros"]

/** Filtros rápidos clicáveis (um clique aplica o termo na pesquisa). */
const FILTROS_RAPIDOS = [
  "Email",
  "Gmail",
  "Instagram",
  "Facebook",
  "Redes Sociais",
  "Faculdade",
  "Trabalho",
  "Jogos",
]

/** Item retornado pela API (senha já descriptografada no backend). */
type SenhaItem = {
  id: number
  categoria: string
  servico: string
  usuario: string
  senha: string
  grupo?: string
}

/** Filtra itens por termo de pesquisa (categoria, serviço, utilizador, grupo). */
function filterBySearch(items: SenhaItem[], query: string, groupFilter: string): SenhaItem[] {
  let list = items
  const q = query.trim().toLowerCase()
  if (q) {
    list = list.filter((item) => {
      const cat = (item.categoria || "").toLowerCase()
      const serv = (item.servico || "").toLowerCase()
      const user = (item.usuario || "").toLowerCase()
      const grp = (item.grupo || "").toLowerCase()
      return cat.includes(q) || serv.includes(q) || user.includes(q) || grp.includes(q)
    })
  }
  if (groupFilter.trim()) {
    const gf = groupFilter.trim().toLowerCase()
    list = list.filter((item) => (item.grupo || "").toLowerCase() === gf)
  }
  return list
}

/** Agrupa por categoria mantendo a ordem. */
function groupByCategoria(items: SenhaItem[]): Map<string, SenhaItem[]> {
  const map = new Map<string, SenhaItem[]>()
  for (const item of items) {
    const cat = item.categoria || "Outros"
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(item)
  }
  return map
}

/** Agrupa por grupo (vazio = "Sem grupo"). */
function groupByGrupo(items: SenhaItem[]): Map<string, SenhaItem[]> {
  const map = new Map<string, SenhaItem[]>()
  for (const item of items) {
    const grp = (item.grupo || "").trim() || "Sem grupo"
    if (!map.has(grp)) map.set(grp, [])
    map.get(grp)!.push(item)
  }
  return map
}

/** Card de senha: ícone do serviço, categoria colorida, ações no hover, tooltip Copiado!, confirmação de delete ao lado. */
function SenhaRow({
  item,
  copyFeedbackId,
  copyUserFeedbackId,
  pendingDeleteId,
  onCopyFeedback,
  onCopyUserFeedback,
  onEdit,
  onDeleteClick,
  onConfirmDelete,
  onCancelDelete,
}: {
  item: SenhaItem
  copyFeedbackId: number | null
  copyUserFeedbackId: number | null
  pendingDeleteId: number | null
  onCopyFeedback: (id: number) => void
  onCopyUserFeedback: (id: number) => void
  onEdit: (item: SenhaItem) => void
  onDeleteClick: (item: SenhaItem) => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}) {
  const [visible, setVisible] = useState(false)
  const { id, servico, usuario, senha, grupo, categoria } = item
  const ServiceIcon = getServiceIcon(servico)
  const showCopied = copyFeedbackId === id
  const showCopiedUser = copyUserFeedbackId === id
  const showConfirmDelete = pendingDeleteId === id

  const copyToClipboard = useCallback(() => {
    if (!senha) return
    navigator.clipboard.writeText(senha).then(() => onCopyFeedback(id))
  }, [senha, id, onCopyFeedback])

  const copyUserToClipboard = useCallback(() => {
    if (!usuario?.trim()) return
    navigator.clipboard.writeText(usuario.trim()).then(() => onCopyUserFeedback(id))
  }, [usuario, id, onCopyUserFeedback])

  return (
    <div
      className={cn(
        "pw-card-item senhas-card flex flex-wrap items-center gap-4 p-4",
        "transition-colors"
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--pw-accent-soft)] text-[var(--pw-accent)]">
        <ServiceIcon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-[var(--pw-text)]">{servico || "—"}</p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              getCategoriaTagClass(categoria)
            )}
          >
            {categoria || "Outros"}
          </span>
          {grupo?.trim() && (
            <span className="rounded-full bg-[var(--pw-accent-soft)] px-2 py-0.5 text-xs text-[var(--pw-accent)]">
              {grupo.trim()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <p className="mt-0.5 text-sm text-[var(--pw-text-muted)]">{usuario || "—"}</p>
          {usuario?.trim() && (
            <span className="relative inline-flex">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-[var(--pw-text-muted)] hover:text-[var(--pw-accent)]"
                onClick={copyUserToClipboard}
                title="Copiar utilizador / conta (email)"
                aria-label="Copiar utilizador ou email"
              >
                <Mail className="size-3.5" />
              </Button>
              {showCopiedUser && (
                <span className="pw-copy-tooltip pw-copy-tooltip--by-user">
                  <Check className="size-3.5" />
                  Copiado!
                </span>
              )}
            </span>
          )}
        </div>
      </div>
      <div className="relative flex items-center gap-1.5 pw-card-actions">
        <div className="relative flex items-center">
          <input
            type="text"
            readOnly
            value={visible ? senha : "••••"}
            className={cn(
              "senhas-input px-2.5 py-1.5 font-mono text-sm",
              visible ? "min-w-[7rem]" : "w-[4.5rem] text-center"
            )}
            aria-label="Senha"
          />
          {showCopied && (
            <span className="pw-copy-tooltip">
              <Check className="size-3.5" />
              Copiado!
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-[var(--pw-text-muted)] hover:text-[var(--pw-text)]"
          onClick={() => setVisible((v) => !v)}
          title={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-[var(--pw-text-muted)] hover:text-[var(--pw-text)]"
          onClick={copyToClipboard}
          title="Copiar senha"
          aria-label="Copiar senha"
        >
          <Copy className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-[var(--pw-text-muted)] hover:text-[var(--pw-text)]"
          onClick={() => onEdit(item)}
          title="Editar"
          aria-label="Editar"
        >
          <Pencil className="size-4" />
        </Button>
        {showConfirmDelete ? (
          <span className="flex items-center gap-1 rounded-md border border-[var(--pw-danger)]/50 bg-[var(--pw-danger)]/10 px-1.5 py-0.5">
            <span className="text-xs text-[var(--pw-text)]">Apagar?</span>
            <Button
              type="button"
              size="sm"
              className="h-6 rounded px-1.5 text-xs font-medium text-[var(--pw-danger)] hover:bg-[var(--pw-danger)]/20"
              onClick={onConfirmDelete}
              aria-label="Confirmar exclusão"
            >
              Sim
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 rounded px-1.5 text-xs text-[var(--pw-text-muted)] hover:text-[var(--pw-text)]"
              onClick={onCancelDelete}
              aria-label="Cancelar"
            >
              Não
            </Button>
          </span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-[var(--pw-text-muted)] hover:text-[var(--pw-danger)]"
            onClick={() => onDeleteClick(item)}
            title="Excluir"
            aria-label="Excluir"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

const emptyForm = {
  categoria: CATEGORIAS_PADRAO[0],
  servico: "",
  usuario: "",
  senha: "",
  grupo: "",
}

export function Senhas() {
  const [items, setItems] = useState<SenhaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copyFeedbackId, setCopyFeedbackId] = useState<number | null>(null)
  const [copyUserFeedbackId, setCopyUserFeedbackId] = useState<number | null>(null)
  const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyUserFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [fetchKey, setFetchKey] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSaving, setFormSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [groupFilter, setGroupFilter] = useState("")
  const [viewBy, setViewBy] = useState<"categoria" | "grupo">("categoria")
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [categoriaDropdownOpen, setCategoriaDropdownOpen] = useState(false)
  const [grupoDropdownOpen, setGrupoDropdownOpen] = useState(false)
  const [healthDiagnostic, setHealthDiagnostic] = useState<{
    ok?: boolean
    databaseUrlDefinida?: boolean
    encryptionKeyDefinida?: boolean
    error?: string
  } | null>(null)

  const fallbackErrorMsg = `Falha ao carregar senhas (status 500). Confirme: (1) Servidor rodando (npm run dev:all na raiz do projeto), (2) server/.env com DATABASE_URL e ENCRYPTION_KEY, (3) Tabela senhas existe. Use "Verificar servidor" abaixo para ver o que falta.`

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setHealthDiagnostic(null)
    fetch("/api/senhas")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const serverMsg =
            typeof data?.error === "string"
              ? data.error
              : data?.error != null
                ? String(data.error)
                : null
          const msg = serverMsg ?? fallbackErrorMsg
          throw new Error(msg)
        }
        return data
      })
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!cancelled) {
          const isNetwork =
            err instanceof TypeError ||
            (err instanceof Error && /fetch|network|loaded/i.test(err.message))
          const msg =
            err instanceof Error
              ? isNetwork
                ? "Servidor de senhas não responde. Na raiz do projeto rode: npm run dev:all"
                : err.message
              : "Erro desconhecido."
          setError(msg)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [fetchKey])

  const retryFetch = useCallback(() => {
    setError(null)
    setHealthDiagnostic(null)
    setFetchKey((k) => k + 1)
  }, [])

  const checkHealth = useCallback(async () => {
    setHealthDiagnostic(null)
    try {
      const res = await fetch("/api/health")
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setHealthDiagnostic({
          ok: data.ok === true,
          databaseUrlDefinida: data.databaseUrlDefinida === true,
          encryptionKeyDefinida: data.encryptionKeyDefinida === true,
        })
      } else {
        setHealthDiagnostic({ error: "Servidor não respondeu OK. Confirme que npm run dev:all está a correr." })
      }
    } catch (e) {
      setHealthDiagnostic({
        error: "Não foi possível contactar o servidor. Rode na raiz do projeto: npm run dev:all",
      })
    }
  }, [])

  const loadItems = useCallback(() => {
    setFetchKey((k) => k + 1)
  }, [])

  const openAddForm = useCallback(() => {
    setEditingId(null)
    const categorias = [...new Set(items.map((i) => i.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    setForm({ ...emptyForm, categoria: categorias[0] ?? "" })
    setFormError(null)
    setFormOpen(true)
  }, [items])

  const openEditForm = useCallback((item: SenhaItem) => {
    setEditingId(item.id)
    setForm({
      categoria: item.categoria || CATEGORIAS_PADRAO[0],
      servico: item.servico || "",
      usuario: item.usuario || "",
      senha: item.senha || "",
      grupo: item.grupo || "",
    })
    setFormError(null)
    setFormOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
  }, [])

  const handleSubmitForm = useCallback(async () => {
    const { categoria, servico, usuario, senha, grupo } = form
    if (!categoria?.trim()) {
      setFormError("Categoria é obrigatória.")
      return
    }
    if (!servico?.trim()) {
      setFormError("Serviço é obrigatório (ex.: GitLab, Instagram).")
      return
    }
    if (!senha?.trim() && !editingId) {
      setFormError("Senha é obrigatória.")
      return
    }
    setFormSaving(true)
    setFormError(null)
    try {
      if (editingId) {
        const res = await fetch(`/api/senhas/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoria: categoria.trim(),
            servico: servico.trim() || null,
            usuario: usuario.trim() || null,
            grupo: grupo?.trim() || null,
            ...(senha.trim() ? { senha: senha.trim() } : {}),
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Erro ao atualizar.")
        loadItems()
        closeForm()
      } else {
        const res = await fetch("/api/senhas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoria: categoria.trim(),
            servico: servico.trim() || null,
            usuario: usuario.trim() || null,
            senha: senha.trim(),
            grupo: grupo?.trim() || null,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Erro ao guardar.")
        loadItems()
        closeForm()
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Erro ao guardar.")
    } finally {
      setFormSaving(false)
    }
  }, [form, editingId, loadItems, closeForm])

  const handleDelete = useCallback(
    async (item: SenhaItem) => {
      try {
        const res = await fetch(`/api/senhas/${item.id}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || "Erro ao apagar.")
        }
        setPendingDeleteId(null)
        loadItems()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao apagar.")
      }
    },
    [loadItems]
  )

  const handleDeleteClick = useCallback((item: SenhaItem) => {
    setPendingDeleteId(item.id)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (pendingDeleteId == null) return
    const item = items.find((i) => i.id === pendingDeleteId)
    if (item) handleDelete(item)
  }, [pendingDeleteId, items, handleDelete])

  const handleCancelDelete = useCallback(() => {
    setPendingDeleteId(null)
  }, [])

  const showCopyFeedback = useCallback((id: number) => {
    if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current)
    setCopyFeedbackId(id)
    copyFeedbackTimerRef.current = setTimeout(() => {
      setCopyFeedbackId(null)
      copyFeedbackTimerRef.current = null
    }, 2000)
  }, [])

  const showCopyUserFeedback = useCallback((id: number) => {
    if (copyUserFeedbackTimerRef.current) clearTimeout(copyUserFeedbackTimerRef.current)
    setCopyUserFeedbackId(id)
    copyUserFeedbackTimerRef.current = setTimeout(() => {
      setCopyUserFeedbackId(null)
      copyUserFeedbackTimerRef.current = null
    }, 2000)
  }, [])

  useEffect(() => {
    if (!formOpen) return
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeForm()
    }
    window.addEventListener("keydown", onEscape)
    return () => window.removeEventListener("keydown", onEscape)
  }, [formOpen, closeForm])

  const filteredItems = filterBySearch(items, searchQuery, groupFilter)
  const byCategory = groupByCategoria(filteredItems)
  const byGrupo = groupByGrupo(filteredItems)
  /** Categorias disponíveis: apenas as que já existem nas senhas guardadas. */
  const categoriasDisponiveis = [
    ...new Set(items.map((i) => i.categoria).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b))
  /** Grupos existentes (para filtro e sugestão no formulário). */
  const gruposDisponiveis = [
    ...new Set(items.map((i) => i.grupo).filter((g) => g?.trim())),
  ].sort((a, b) => (a || "").localeCompare(b || ""))

  const currentGroupMap = viewBy === "grupo" ? byGrupo : byCategory
  const currentGroupLabel = viewBy === "grupo" ? "Grupo" : "Categoria"

  return (
    <div className="senhas-page min-h-screen p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Cabeçalho compacto com glass */}
        <header className="senhas-card flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--pw-accent-soft)] text-[var(--pw-accent)]">
              <KeyRound className="size-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[var(--pw-text)]">
                Gerenciamento de senhas
              </h1>
              <p className="text-sm text-[var(--pw-text-muted)]">
                Organizadas por categoria e grupo. Copiar funciona com senha oculta.
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="gap-1.5 rounded-[10px] bg-[var(--pw-accent)] text-white hover:opacity-90"
            onClick={openAddForm}
            title="Adicionar nova senha"
            aria-label="Adicionar senha"
          >
            <Plus className="size-4" />
            Adicionar senha
          </Button>
        </header>

        {/* Barra de pesquisa + filtros retráteis */}
        <section className="senhas-card space-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Search className="size-4 text-[var(--pw-text-muted)]" aria-hidden />
            <input
              type="search"
              placeholder="Pesquisar (email, serviço, grupo…)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="senhas-input max-w-xs flex-1 px-3 py-2 text-sm"
              aria-label="Pesquisar senhas"
            />
            {(searchQuery.trim() || groupFilter.trim()) && (
              <span className="text-sm text-[var(--pw-text-muted)]">
                {filteredItems.length} de {items.length}
              </span>
            )}
            <button
              type="button"
              onClick={() => setFiltersExpanded((e) => !e)}
              className="senhas-chip flex items-center gap-1.5"
              title={filtersExpanded ? "Recolher filtros" : "Mostrar filtros"}
              aria-expanded={filtersExpanded}
            >
              <Filter className="size-3.5" />
              Filtros
              {filtersExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          </div>
          {filtersExpanded && (
          <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={cn(
                "senhas-chip",
                !searchQuery.trim() && !groupFilter.trim() && "active"
              )}
              onClick={() => { setSearchQuery(""); setGroupFilter("") }}
              title="Mostrar todas"
            >
              Todos
            </button>
            {FILTROS_RAPIDOS.map((label) => {
              const active = searchQuery.trim().toLowerCase() === label.toLowerCase()
              return (
                <button
                  key={label}
                  type="button"
                  className={cn("senhas-chip", active && "active")}
                  onClick={() =>
                    setSearchQuery((q) =>
                      q.trim().toLowerCase() === label.toLowerCase() ? "" : label
                    )
                  }
                  title={`Filtrar: ${label}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {gruposDisponiveis.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--pw-border)] pt-3">
              <button
                type="button"
                className={cn("senhas-chip gap-1", !groupFilter.trim() && "active")}
                onClick={() => setGroupFilter("")}
                title="Qualquer grupo"
              >
                <FolderOpen className="size-3.5" />
                Qualquer
              </button>
              {gruposDisponiveis.map((g) => {
                const active = groupFilter.trim().toLowerCase() === (g || "").toLowerCase()
                return (
                  <button
                    key={g}
                    type="button"
                    className={cn("senhas-chip gap-1", active && "active")}
                    onClick={() =>
                      setGroupFilter((gf) =>
                        gf.trim().toLowerCase() === (g || "").toLowerCase() ? "" : g || ""
                      )
                    }
                    title={`Grupo: ${g}`}
                  >
                    <FolderOpen className="size-3.5" />
                    {g}
                  </button>
                )
              })}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--pw-border)] pt-3">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--pw-text-muted)]">
              Agrupar por
            </span>
            <button
              type="button"
              className={cn("senhas-chip gap-1", viewBy === "categoria" && "active")}
              onClick={() => setViewBy("categoria")}
              title="Por categoria"
            >
              <LayoutGrid className="size-3.5" />
              Categoria
            </button>
            <button
              type="button"
              className={cn("senhas-chip gap-1", viewBy === "grupo" && "active")}
              onClick={() => setViewBy("grupo")}
              title="Por grupo"
            >
              <FolderOpen className="size-3.5" />
              Grupo
            </button>
          </div>
          </>
          )}
        </section>

        {/* Modal: Nova / Editar senha */}
        {formOpen && (
          <div
            className="senhas-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="senhas-modal-title"
            onClick={(e) => e.target === e.currentTarget && closeForm()}
          >
            <div
              className="senhas-modal-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--pw-border)] px-5 py-4">
                <h2 id="senhas-modal-title" className="text-lg font-semibold text-[var(--pw-text)]">
                  {editingId ? "Editar senha" : "Nova senha"}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-[var(--pw-text-muted)] hover:text-[var(--pw-text)]"
                  onClick={closeForm}
                  aria-label="Fechar"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="space-y-4 px-5 py-4">
                <p className="text-sm text-[var(--pw-text-muted)]">
                  Preencha os campos. Use Grupo para agrupar senhas do mesmo projeto ou sistema.
                </p>
                {formError && (
                  <p className="text-sm text-[var(--pw-danger)]" role="alert">
                    {formError}
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-[var(--pw-text-muted)]">Categoria</span>
                    <div className="relative">
                      <input
                        value={form.categoria}
                        onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                        onFocus={() => setCategoriaDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setCategoriaDropdownOpen(false), 180)}
                        placeholder="Ex.: Redes Sociais, Jogos..."
                        className="senhas-input w-full px-3 py-2 text-sm"
                        autoComplete="off"
                        aria-expanded={categoriaDropdownOpen}
                        aria-haspopup="listbox"
                        aria-autocomplete="list"
                      />
                      {categoriaDropdownOpen && (
                        <ul
                          className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-[var(--pw-border)] bg-[var(--pw-card-solid)] py-1 shadow-lg"
                          role="listbox"
                        >
                          {categoriasDisponiveis
                            .filter((c) =>
                              c.toLowerCase().includes((form.categoria || "").toLowerCase().trim())
                            )
                            .map((c) => (
                              <li
                                key={c}
                                role="option"
                                className="cursor-pointer px-3 py-2 text-sm text-[var(--pw-text)] hover:bg-[var(--pw-accent-soft)]"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  setForm((f) => ({ ...f, categoria: c }))
                                  setCategoriaDropdownOpen(false)
                                }}
                              >
                                {c}
                              </li>
                            ))}
                          {categoriasDisponiveis.filter((c) =>
                            c.toLowerCase().includes((form.categoria || "").toLowerCase().trim())
                          ).length === 0 && (
                            <li className="px-3 py-2 text-sm text-[var(--pw-text-muted)]">
                              Escreva e pressione Enter para usar um novo valor
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-[var(--pw-text-muted)]">Grupo (opcional)</span>
                    <div className="relative">
                      <input
                        value={form.grupo}
                        onChange={(e) => setForm((f) => ({ ...f, grupo: e.target.value }))}
                        onFocus={() => setGrupoDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setGrupoDropdownOpen(false), 180)}
                        placeholder="Ex.: Projeto Alpha..."
                        className="senhas-input w-full px-3 py-2 text-sm"
                        autoComplete="off"
                        aria-expanded={grupoDropdownOpen}
                        aria-haspopup="listbox"
                        aria-autocomplete="list"
                      />
                      {grupoDropdownOpen && (
                        <ul
                          className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-[var(--pw-border)] bg-[var(--pw-card-solid)] py-1 shadow-lg"
                          role="listbox"
                        >
                          {gruposDisponiveis
                            .filter((g) =>
                              (g || "").toLowerCase().includes((form.grupo || "").toLowerCase().trim())
                            )
                            .map((g) => (
                              <li
                                key={g || ""}
                                role="option"
                                className="cursor-pointer px-3 py-2 text-sm text-[var(--pw-text)] hover:bg-[var(--pw-accent-soft)]"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  setForm((f) => ({ ...f, grupo: g || "" }))
                                  setGrupoDropdownOpen(false)
                                }}
                              >
                                {g || ""}
                              </li>
                            ))}
                          {gruposDisponiveis.length === 0 && (
                            <li className="px-3 py-2 text-sm text-[var(--pw-text-muted)]">
                              Nenhum grupo ainda. Escreva para criar.
                            </li>
                          )}
                          {gruposDisponiveis.length > 0 &&
                            gruposDisponiveis.filter((g) =>
                              (g || "").toLowerCase().includes((form.grupo || "").toLowerCase().trim())
                            ).length === 0 && (
                              <li className="px-3 py-2 text-sm text-[var(--pw-text-muted)]">
                                Escreva e pressione Enter para usar um novo valor
                              </li>
                            )}
                        </ul>
                      )}
                    </div>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-[var(--pw-text-muted)]">Serviço</span>
                    <input
                      value={form.servico}
                      onChange={(e) => setForm((f) => ({ ...f, servico: e.target.value }))}
                      placeholder="Ex.: Instagram"
                      className="senhas-input w-full px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-[var(--pw-text-muted)]">Utilizador / conta</span>
                    <input
                      value={form.usuario}
                      onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
                      placeholder="Nome de utilizador"
                      className="senhas-input w-full px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-sm font-medium text-[var(--pw-text-muted)]">
                      Senha {editingId && "(deixar em branco para não alterar)"}
                    </span>
                    <input
                      type="password"
                      value={form.senha}
                      onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                      placeholder="Senha"
                      className="senhas-input w-full px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    className="rounded-[10px] bg-[var(--pw-accent)] text-white hover:opacity-90"
                    onClick={handleSubmitForm}
                    disabled={formSaving}
                  >
                    {formSaving ? "A guardar…" : editingId ? "Atualizar" : "Guardar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-[10px] border-[var(--pw-border)] text-[var(--pw-text-muted)] hover:bg-[var(--pw-border-hover)] hover:text-[var(--pw-text)]"
                    onClick={closeForm}
                    disabled={formSaving}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      {loading && (
        <p className="text-[var(--pw-text-muted)]">A carregar…</p>
      )}

      {error && (
        <div className="senhas-card rounded-[var(--pw-radius)] border-[var(--pw-danger)]/30 bg-[var(--pw-danger)]/10 px-5 py-4">
          <p className="mb-3 text-sm text-[var(--pw-danger)]">{error}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-[var(--pw-radius-sm)] border-[var(--pw-border)]" onClick={retryFetch}>
              Tentar novamente
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-[var(--pw-radius-sm)] border-[var(--pw-border)]" onClick={checkHealth}>
              Verificar servidor
            </Button>
          </div>
          {healthDiagnostic && (
            <div className="mt-3 rounded-md border border-[var(--pw-border)] bg-[var(--pw-card)] px-3 py-2 text-xs">
              {healthDiagnostic.error ? (
                <p className="text-[var(--pw-danger)]">{healthDiagnostic.error}</p>
              ) : (
                <ul className="space-y-1 text-[var(--pw-text-muted)]">
                  <li>Servidor: {healthDiagnostic.ok ? "OK" : "—"}</li>
                  <li>DATABASE_URL no .env: {healthDiagnostic.databaseUrlDefinida ? "definida" : "falta"}</li>
                  <li>ENCRYPTION_KEY no .env: {healthDiagnostic.encryptionKeyDefinida ? "definida" : "falta"}</li>
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {!loading && !error && currentGroupMap.size === 0 && !formOpen && (
        <div className="senhas-card flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[var(--pw-text-muted)]">
            {items.length === 0
              ? "Nenhuma senha registada. Use \"Adicionar senha\" para criar a primeira."
              : "Nenhum resultado. Tente outro termo ou limpe os filtros."}
          </p>
        </div>
      )}

      {!loading && !error && currentGroupMap.size > 0 && (
        <section aria-label={`Senhas por ${currentGroupLabel.toLowerCase()}`} className="space-y-6">
          {Array.from(currentGroupMap.entries()).map(([nome, list]) => (
            <div key={nome} className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--pw-text-muted)]">
                {viewBy === "grupo" && nome !== "Sem grupo" && <FolderOpen className="size-4 text-[var(--pw-accent)]" />}
                {nome}
                <span className="font-normal normal-case tracking-normal">({list.length})</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-1">
                {list.map((item) => (
                  <SenhaRow
                    key={item.id}
                    item={item}
                    copyFeedbackId={copyFeedbackId}
                    copyUserFeedbackId={copyUserFeedbackId}
                    pendingDeleteId={pendingDeleteId}
                    onCopyFeedback={showCopyFeedback}
                    onCopyUserFeedback={showCopyUserFeedback}
                    onEdit={openEditForm}
                    onDeleteClick={handleDeleteClick}
                    onConfirmDelete={handleConfirmDelete}
                    onCancelDelete={handleCancelDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
      </div>
    </div>
  )
}
