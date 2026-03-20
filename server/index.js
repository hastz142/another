/**
 * Backend da aplicação Another World.
 * Expõe a API de senhas: dados descriptografados apenas aqui; a chave nunca vai para o frontend.
 */

import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.join(__dirname, "..", "dist")

if (process.env.NODE_ENV === "production" && !fs.existsSync(distPath)) {
  console.warn(
    "⚠ [AVISO] Pasta dist/ não encontrada. Em produção rode 'npm run build' na raiz do projeto antes de iniciar o servidor."
  )
}

dotenv.config({ path: path.join(__dirname, ".env") })
import express from "express"
import cors from "cors"
import morgan from "morgan"
import { listarSenhas, inserirSenha, atualizarSenha, apagarSenha } from "./db.js"
import { decrypt, encrypt } from "./crypto.js"
import * as aw from "./db-another-world.js"

const app = express()
const PORT = process.env.PORT || 3001
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

app.set("trust proxy", 1)
app.use(express.json({ limit: "2mb" }))

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : []
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true)
      if (process.env.NODE_ENV === "development") return callback(null, true)
      if (allowedOrigins.includes(origin)) return callback(null, true)
      return callback(null, false)
    },
  })
)
app.use(morgan("combined"))

// Log de duração dos pedidos à API (para diagnosticar latência)
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) return next()
  const start = Date.now()
  res.on("finish", () => {
    const ms = Date.now() - start
    if (ms > 500) console.log(`[api] ${req.method} ${req.path} ${res.statusCode} ${ms} ms`)
  })
  next()
})

/** Diagnóstico: confirma se o .env está a ser carregado (sem revelar valores). */
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    databaseUrlDefinida: !!process.env.DATABASE_URL,
    encryptionKeyDefinida: !!process.env.ENCRYPTION_KEY,
  })
})

/** Ping leve para medir latência e monitorar conexão (usado pela página Rede). */
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, ts: Date.now() })
})

/** Verifica se a internet está acessível (servidor faz request a um endpoint público). Usado para distinguir "servidor fora" de "internet fora". */
app.get("/api/ping-external", async (_req, res) => {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const r = await fetch("https://www.google.com/generate_204", {
      method: "GET",
      signal: controller.signal,
    })
    clearTimeout(timeout)
    res.json({ ok: r.status === 204 })
  } catch {
    res.json({ ok: false })
  }
})

/** Opcional: recebe eventos de rede do front para observabilidade (timestamp, status, latency, etc.). */
app.post("/api/network-log", (req, res) => {
  const body = req.body || {}
  console.log("[network-log]", new Date().toISOString(), JSON.stringify(body))
  res.status(204).send()
})

/**
 * GET /api/senhas
 * Retorna todas as senhas ordenadas por categoria, com o campo senha já descriptografado.
 * A chave de criptografia fica apenas no backend.
 */
app.get("/api/senhas", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      error: "DATABASE_URL não definida. Crie o ficheiro server/.env com DATABASE_URL (ver server/.env.example).",
    })
  }
  if (!ENCRYPTION_KEY) {
    return res.status(500).json({
      error: "ENCRYPTION_KEY não definida. Adicione ENCRYPTION_KEY ao server/.env (ex.: openssl rand -hex 32).",
    })
  }
  try {
    const rows = await listarSenhas()
    const decrypted = rows.map((row) => ({
      id: row.id,
      categoria: row.categoria,
      servico: row.servico,
      usuario: row.usuario ?? "",
      senha: decrypt(row.senha, ENCRYPTION_KEY),
      grupo: row.grupo ?? "",
    }))
    res.json(decrypted)
  } catch (err) {
    console.error("Erro ao listar senhas:", err)
    const code = err.code || ""
    const msg = (err.message || "").toLowerCase()
    if (msg.includes("column") && msg.includes("grupo") && msg.includes("does not exist")) {
      return res.status(500).json({
        error: "A tabela 'senhas' existe mas falta a coluna 'grupo'. Execute no Supabase (SQL Editor) o ficheiro server/migrations/add-grupo.sql.",
      })
    }
    if (code === "42P01" || (msg.includes("does not exist") && msg.includes("senhas"))) {
      return res.status(500).json({
        error: "Tabela 'senhas' não existe. Execute o script server/schema-senhas.sql no seu banco de dados (Supabase: SQL Editor).",
      })
    }
    if (code === "28P01" || msg.includes("password authentication failed")) {
      return res.status(500).json({
        error:
          "Password da base de dados incorreta ou inválida. Em Supabase: Project Settings > Database > Database password (não uses a API key). Se a password tiver caracteres especiais (@, #, :, /), codifica-os na URL (ex.: @ = %40, # = %23).",
      })
    }
    if (code === "ECONNREFUSED" || code === "ENOTFOUND" || msg.includes("connect")) {
      return res.status(500).json({
        error: "Não foi possível ligar ao banco. Confirme DATABASE_URL e que o PostgreSQL está a correr.",
      })
    }
    res.status(500).json({ error: msg || "Erro ao carregar senhas." })
  }
})

/**
 * POST /api/senhas
 * Body: { categoria, servico?, usuario?, senha }. A senha é criptografada antes de guardar.
 */
app.post("/api/senhas", async (req, res) => {
  if (!process.env.DATABASE_URL || !ENCRYPTION_KEY) {
    return res.status(500).json({ error: "DATABASE_URL ou ENCRYPTION_KEY não definidas." })
  }
  const { categoria, servico, usuario, senha, grupo } = req.body || {}
  if (!categoria || typeof categoria !== "string" || !categoria.trim()) {
    return res.status(400).json({ error: "categoria é obrigatória." })
  }
  if (!senha || typeof senha !== "string") {
    return res.status(400).json({ error: "senha é obrigatória." })
  }
  try {
    const senhaCriptografada = encrypt(senha.trim(), ENCRYPTION_KEY)
    const grupoVal = grupo !== undefined && typeof grupo === "string" ? grupo.trim() || null : null
    const row = await inserirSenha(
      categoria.trim(),
      (servico && typeof servico === "string" ? servico.trim() : null) || null,
      (usuario && typeof usuario === "string" ? usuario.trim() : null) || null,
      senhaCriptografada,
      grupoVal
    )
    res.status(201).json(row)
  } catch (err) {
    console.error("Erro ao inserir senha:", err)
    res.status(500).json({ error: err.message || "Erro ao guardar senha." })
  }
})

/**
 * PUT /api/senhas/:id
 * Body: { categoria?, servico?, usuario?, senha? }. Se senha vier, é criptografada.
 */
app.put("/api/senhas/:id", async (req, res) => {
  if (!process.env.DATABASE_URL || !ENCRYPTION_KEY) {
    return res.status(500).json({ error: "DATABASE_URL ou ENCRYPTION_KEY não definidas." })
  }
  const id = parseInt(req.params.id, 10)
  if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido." })
  const { categoria, servico, usuario, senha, grupo } = req.body || {}
  try {
    const updates = {}
    if (categoria !== undefined) updates.categoria = typeof categoria === "string" ? categoria.trim() : null
    if (servico !== undefined) updates.servico = typeof servico === "string" ? servico.trim() : null
    if (usuario !== undefined) updates.usuario = typeof usuario === "string" ? usuario.trim() : null
    if (senha !== undefined && typeof senha === "string") {
      updates.senhaCriptografada = encrypt(senha.trim(), ENCRYPTION_KEY)
    }
    if (grupo !== undefined) updates.grupo = typeof grupo === "string" ? (grupo.trim() || null) : null
    const row = await atualizarSenha(id, updates)
    if (!row) return res.status(404).json({ error: "Registo não encontrado." })
    res.json(row)
  } catch (err) {
    console.error("Erro ao atualizar senha:", err)
    res.status(500).json({ error: err.message || "Erro ao atualizar." })
  }
})

/**
 * DELETE /api/senhas/:id
 */
app.delete("/api/senhas/:id", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "DATABASE_URL não definida." })
  }
  const id = parseInt(req.params.id, 10)
  if (Number.isNaN(id)) return res.status(400).json({ error: "id inválido." })
  try {
    await apagarSenha(id)
    res.status(204).send()
  } catch (err) {
    console.error("Erro ao apagar senha:", err)
    res.status(500).json({ error: err.message || "Erro ao apagar." })
  }
})

// -----------------------------------------------------------------------------
// API para dados que estavam em localStorage (tabelas aw_*)
// Requer: DATABASE_URL e ter executado server/schema-another-world.sql
// -----------------------------------------------------------------------------
function handleAwError(err, res) {
  console.error(err)
  const msg = (err.message || "").toLowerCase()
  const code = err.code || ""
  if (code === "42P01" || (msg.includes("does not exist") && msg.includes("aw_"))) {
    return res.status(500).json({
      error: "Tabelas aw_* não existem. Execute server/schema-another-world.sql no banco (Supabase: SQL Editor).",
    })
  }
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || msg.includes("connect")) {
    return res.status(503).json({ error: "Não foi possível ligar ao banco. Confirme DATABASE_URL." })
  }
  return res.status(500).json({ error: err.message || "Erro no servidor." })
}

function requireDb(req, res, next) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "DATABASE_URL não definida no server/.env" })
  }
  next()
}

// Bookmarks
app.get("/api/bookmarks", requireDb, async (req, res) => {
  try {
    const data = await aw.listBookmarks()
    res.json(data)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.post("/api/bookmarks", requireDb, express.json(), async (req, res) => {
  try {
    const body = req.body || {}
    const id = body.id || `bm-${Date.now()}`
    const item = {
      id,
      url: (body.url ?? "").trim(),
      title: (body.title ?? "").trim(),
      tags: Array.isArray(body.tags) ? body.tags : [],
      source: (body.source ?? "").trim(),
      note: (body.note ?? "").trim(),
      createdAt: body.createdAt ?? Date.now(),
    }
    await aw.insertBookmark(item)
    res.status(201).json(item)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.put("/api/bookmarks/:id", requireDb, express.json(), async (req, res) => {
  try {
    const id = req.params.id
    const body = req.body || {}
    const patch = {}
    if (body.url !== undefined) patch.url = String(body.url).trim()
    if (body.title !== undefined) patch.title = String(body.title).trim()
    if (body.tags !== undefined) patch.tags = Array.isArray(body.tags) ? body.tags : []
    if (body.source !== undefined) patch.source = String(body.source).trim()
    if (body.note !== undefined) patch.note = String(body.note).trim()
    const updated = await aw.updateBookmark(id, patch)
    if (!updated) return res.status(404).json({ error: "Bookmark não encontrado." })
    res.json(updated)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.delete("/api/bookmarks/:id", requireDb, async (req, res) => {
  try {
    await aw.deleteBookmark(req.params.id)
    res.status(204).send()
  } catch (err) {
    handleAwError(err, res)
  }
})

// Ideias
app.get("/api/ideias", requireDb, async (req, res) => {
  try {
    const data = await aw.listIdeias()
    res.json(data)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.post("/api/ideias", requireDb, express.json(), async (req, res) => {
  try {
    const body = req.body || {}
    const id = body.id || `ideia-${Date.now()}`
    const item = { id, text: (body.text ?? "").trim(), createdAt: body.createdAt ?? Date.now() }
    await aw.insertIdeia(item)
    res.status(201).json(item)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.put("/api/ideias/:id", requireDb, express.json(), async (req, res) => {
  try {
    const body = req.body || {}
    const updated = await aw.updateIdeia(req.params.id, { text: body.text !== undefined ? String(body.text).trim() : undefined })
    if (!updated) return res.status(404).json({ error: "Ideia não encontrada." })
    res.json(updated)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.delete("/api/ideias/:id", requireDb, async (req, res) => {
  try {
    await aw.deleteIdeia(req.params.id)
    res.status(204).send()
  } catch (err) {
    handleAwError(err, res)
  }
})

// Notas
app.get("/api/notas", requireDb, async (req, res) => {
  try {
    const data = await aw.listNotas()
    res.json(data)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.get("/api/notas/:id", requireDb, async (req, res) => {
  try {
    const nota = await aw.getNota(req.params.id)
    if (!nota) return res.status(404).json({ error: "Nota não encontrada." })
    res.json(nota)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.post("/api/notas", requireDb, express.json(), async (req, res) => {
  try {
    const body = req.body || {}
    const id = body.id || `nota-${Date.now()}`
    const item = {
      id,
      title: (body.title ?? "").trim(),
      content: body.content ?? "",
      tags: Array.isArray(body.tags) ? body.tags : [],
      pinned: !!body.pinned,
      pinnedOrder: body.pinnedOrder ?? 0,
    }
    const inserted = await aw.insertNota(item)
    res.status(201).json(inserted)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.put("/api/notas/:id", requireDb, express.json(), async (req, res) => {
  try {
    const body = req.body || {}
    const patch = {}
    if (body.title !== undefined) patch.title = String(body.title).trim()
    if (body.content !== undefined) patch.content = String(body.content)
    if (body.tags !== undefined) patch.tags = Array.isArray(body.tags) ? body.tags : []
    if (body.pinned !== undefined) patch.pinned = !!body.pinned
    if (body.pinnedOrder !== undefined) patch.pinnedOrder = Number(body.pinnedOrder)
    const updated = await aw.updateNota(req.params.id, patch)
    if (!updated) return res.status(404).json({ error: "Nota não encontrada." })
    res.json(updated)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.delete("/api/notas/:id", requireDb, async (req, res) => {
  try {
    await aw.deleteNota(req.params.id)
    res.status(204).send()
  } catch (err) {
    handleAwError(err, res)
  }
})

// Custom checklists
app.get("/api/checklists", requireDb, async (req, res) => {
  try {
    const data = await aw.listCustomChecklists()
    res.json(data)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.post("/api/checklists", requireDb, express.json(), async (req, res) => {
  try {
    const body = req.body || {}
    const id = body.id || `checklist-${Date.now()}`
    const item = { id, name: (body.name ?? "").trim(), items: Array.isArray(body.items) ? body.items : [] }
    await aw.insertCustomChecklist(item)
    res.status(201).json(item)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.put("/api/checklists/:id", requireDb, express.json(), async (req, res) => {
  try {
    const body = req.body || {}
    const patch = {}
    if (body.name !== undefined) patch.name = String(body.name).trim()
    if (body.items !== undefined) patch.items = Array.isArray(body.items) ? body.items : []
    const updated = await aw.updateCustomChecklist(req.params.id, patch)
    if (!updated) return res.status(404).json({ error: "Checklist não encontrado." })
    res.json(updated)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.delete("/api/checklists/:id", requireDb, async (req, res) => {
  try {
    await aw.deleteCustomChecklist(req.params.id)
    res.status(204).send()
  } catch (err) {
    handleAwError(err, res)
  }
})

// Notepad completed (checklist task completion map)
app.get("/api/notepad-completed", requireDb, async (req, res) => {
  try {
    const payload = await aw.getNotepadCompleted()
    res.json(payload)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.put("/api/notepad-completed", requireDb, express.json(), async (req, res) => {
  try {
    const payload = req.body && typeof req.body === "object" ? req.body : {}
    await aw.saveNotepadCompleted(payload)
    res.json(payload)
  } catch (err) {
    handleAwError(err, res)
  }
})

// Fluxos
app.get("/api/fluxos", requireDb, async (req, res) => {
  try {
    const data = await aw.listFluxos()
    res.json(data)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.post("/api/fluxos", requireDb, express.json(), async (req, res) => {
  try {
    const body = req.body || {}
    const id = body.id || `fluxo-${Date.now()}`
    const item = {
      id,
      name: (body.name ?? "").trim(),
      nodes: Array.isArray(body.nodes) ? body.nodes : [],
      edges: Array.isArray(body.edges) ? body.edges : [],
    }
    await aw.insertFluxo(item)
    res.status(201).json(item)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.put("/api/fluxos/:id", requireDb, express.json(), async (req, res) => {
  try {
    const body = req.body || {}
    const patch = {}
    if (body.name !== undefined) patch.name = String(body.name).trim()
    if (body.nodes !== undefined) patch.nodes = Array.isArray(body.nodes) ? body.nodes : []
    if (body.edges !== undefined) patch.edges = Array.isArray(body.edges) ? body.edges : []
    const updated = await aw.updateFluxo(req.params.id, patch)
    if (!updated) return res.status(404).json({ error: "Fluxo não encontrado." })
    res.json(updated)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.delete("/api/fluxos/:id", requireDb, async (req, res) => {
  try {
    await aw.deleteFluxo(req.params.id)
    res.status(204).send()
  } catch (err) {
    handleAwError(err, res)
  }
})

// Mesa estado (GET / PUT um único payload)
app.get("/api/mesa", requireDb, async (req, res) => {
  try {
    const data = await aw.getMesaEstado()
    res.json(data)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.put("/api/mesa", requireDb, express.json(), async (req, res) => {
  try {
    const payload = req.body || {}
    const state = {
      nodes: Array.isArray(payload.nodes) ? payload.nodes : [],
      edges: Array.isArray(payload.edges) ? payload.edges : [],
      viewport: payload.viewport && typeof payload.viewport === "object" ? payload.viewport : { x: 0, y: 0, zoom: 1 },
      isLocked: !!payload.isLocked,
    }
    await aw.saveMesaEstado(state)
    res.json(state)
  } catch (err) {
    handleAwError(err, res)
  }
})

// Mesa sessoes (exportar filtro da mesa para o banco)
app.get("/api/mesa-sessoes", requireDb, async (req, res) => {
  try {
    const list = await aw.listMesaSessoes()
    res.json(list)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.get("/api/mesa-sessoes/:id", requireDb, async (req, res) => {
  try {
    const item = await aw.getMesaSessao(req.params.id)
    if (!item) return res.status(404).json({ error: "Sessão não encontrada" })
    res.json(item)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.post("/api/mesa-sessoes", requireDb, express.json(), async (req, res) => {
  try {
    const body = req.body || {}
    const id = body.id && String(body.id).trim() ? body.id : `sessao-${Date.now()}`
    const item = {
      id,
      name: body.name ?? null,
      categoryId: body.categoryId ?? "",
      payload: body.payload ?? {},
    }
    await aw.insertMesaSessao(item)
    const created = await aw.getMesaSessao(id)
    res.status(201).json(created)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.delete("/api/mesa-sessoes/:id", requireDb, async (req, res) => {
  try {
    await aw.deleteMesaSessao(req.params.id)
    res.status(204).send()
  } catch (err) {
    handleAwError(err, res)
  }
})

// Pomodoro settings (GET / PUT)
app.get("/api/pomodoro-settings", requireDb, async (req, res) => {
  try {
    const data = await aw.getPomodoroSettings()
    res.json(data)
  } catch (err) {
    handleAwError(err, res)
  }
})
app.put("/api/pomodoro-settings", requireDb, express.json(), async (req, res) => {
  try {
    const body = req.body || {}
    const settings = {
      workMinutes: body.workMinutes ?? 25,
      shortBreakMinutes: body.shortBreakMinutes ?? 5,
      longBreakMinutes: body.longBreakMinutes ?? 15,
      longBreakAfterCycles: body.longBreakAfterCycles ?? 4,
    }
    await aw.savePomodoroSettings(settings)
    res.json(settings)
  } catch (err) {
    handleAwError(err, res)
  }
})

// Frontend (build do Vite) — ordem: API primeiro, depois static, depois fallback
// index: false → index.html não é servido pelo static (evita cache 7d no HTML)
app.use(
  express.static(distPath, {
    maxAge: "7d",
    etag: true,
    index: false,
  })
)
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Not found" })
  }
  res.setHeader("Cache-Control", "no-store")
  const indexPath = path.join(distPath, "index.html")
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("Erro ao enviar index.html:", err.message)
      if (!res.headersSent) {
        res.status(err.status === 404 ? 404 : 500).type("text/plain").send(
          "Frontend não disponível. Execute 'npm run build' na raiz do projeto."
        )
      }
    }
  })
})

const server = app.listen(PORT, async () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
  if (process.env.DATABASE_URL) {
    try {
      const { getPool } = await import("./db.js")
      const client = await getPool().connect()
      client.release()
      console.log("Pool de base de dados aquecido (primeira conexão estabelecida).")
    } catch (e) {
      console.warn("Aviso: não foi possível aquecer o pool ao arranque:", e.message)
    }
  }
})

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n⚠ Porta ${PORT} já está em uso. Feche o processo que a usa ou use outra porta:\n  set PORT=3002 && npm run dev:server\n`)
  }
  throw err
})
