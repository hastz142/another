/**
 * Acesso às tabelas aw_* (bookmarks, ideias, notas, checklists, fluxos, mesa, pomodoro).
 * Usa o mesmo pool que server/db.js (DATABASE_URL).
 */

import { getPool } from "./db.js"

// ---- Bookmarks ----
export async function listBookmarks() {
  const client = await getPool().connect()
  try {
    const res = await client.query(
      `SELECT id, url, title, tags, source, note,
              EXTRACT(EPOCH FROM created_at) * 1000 AS "createdAt"
       FROM aw_bookmarks ORDER BY created_at DESC`
    )
    return res.rows.map((r) => ({
      id: r.id,
      url: r.url ?? "",
      title: r.title ?? "",
      tags: Array.isArray(r.tags) ? r.tags : [],
      source: r.source ?? "",
      note: r.note ?? "",
      createdAt: Math.round(Number(r.createdAt)),
    }))
  } finally {
    client.release()
  }
}

export async function insertBookmark(item) {
  const client = await getPool().connect()
  try {
    await client.query(
      `INSERT INTO aw_bookmarks (id, url, title, tags, source, note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0))`,
      [
        item.id,
        item.url ?? "",
        item.title ?? "",
        JSON.stringify(item.tags || []),
        item.source ?? "",
        item.note ?? "",
        item.createdAt ?? Date.now(),
      ]
    )
    return item
  } finally {
    client.release()
  }
}

export async function updateBookmark(id, patch) {
  const client = await getPool().connect()
  try {
    const updates = []
    const values = []
    let i = 1
    if (patch.url !== undefined) {
      updates.push(`url = $${i++}`)
      values.push(patch.url)
    }
    if (patch.title !== undefined) {
      updates.push(`title = $${i++}`)
      values.push(patch.title)
    }
    if (patch.tags !== undefined) {
      updates.push(`tags = $${i++}`)
      values.push(JSON.stringify(Array.isArray(patch.tags) ? patch.tags : []))
    }
    if (patch.source !== undefined) {
      updates.push(`source = $${i++}`)
      values.push(patch.source)
    }
    if (patch.note !== undefined) {
      updates.push(`note = $${i++}`)
      values.push(patch.note)
    }
    if (updates.length === 0) return (await listBookmarks()).find((b) => b.id === id) || null
    values.push(id)
    await client.query(`UPDATE aw_bookmarks SET ${updates.join(", ")} WHERE id = $${i}`, values)
    return (await listBookmarks()).find((b) => b.id === id) || null
  } finally {
    client.release()
  }
}

export async function deleteBookmark(id) {
  const client = await getPool().connect()
  try {
    await client.query("DELETE FROM aw_bookmarks WHERE id = $1", [id])
  } finally {
    client.release()
  }
}

// ---- Ideias ----
export async function listIdeias() {
  const client = await getPool().connect()
  try {
    const res = await client.query(
      `SELECT id, text, EXTRACT(EPOCH FROM created_at) * 1000 AS "createdAt"
       FROM aw_ideias ORDER BY created_at DESC`
    )
    return res.rows.map((r) => ({
      id: r.id,
      text: r.text ?? "",
      createdAt: Math.round(Number(r.createdAt)),
    }))
  } finally {
    client.release()
  }
}

export async function insertIdeia(item) {
  const client = await getPool().connect()
  try {
    await client.query(
      `INSERT INTO aw_ideias (id, text, created_at) VALUES ($1, $2, to_timestamp($3 / 1000.0))`,
      [item.id, item.text, item.createdAt ?? Date.now()]
    )
    return item
  } finally {
    client.release()
  }
}

export async function updateIdeia(id, patch) {
  const client = await getPool().connect()
  try {
    if (patch.text === undefined) return (await listIdeias()).find((i) => i.id === id) || null
    await client.query("UPDATE aw_ideias SET text = $1 WHERE id = $2", [patch.text, id])
    return (await listIdeias()).find((i) => i.id === id) || null
  } finally {
    client.release()
  }
}

export async function deleteIdeia(id) {
  const client = await getPool().connect()
  try {
    await client.query("DELETE FROM aw_ideias WHERE id = $1", [id])
  } finally {
    client.release()
  }
}

// ---- Notas ----
export async function listNotas() {
  const client = await getPool().connect()
  try {
    const res = await client.query(
      `SELECT id, title, content, tags, pinned, pinned_order AS "pinnedOrder",
              EXTRACT(EPOCH FROM updated_at) * 1000 AS "updatedAt"
       FROM aw_notas ORDER BY pinned DESC, pinned_order ASC, updated_at DESC NULLS LAST`
    )
    return res.rows.map((r) => ({
      id: r.id,
      title: r.title ?? "",
      content: r.content ?? "",
      tags: Array.isArray(r.tags) ? r.tags : [],
      pinned: !!r.pinned,
      pinnedOrder: r.pinnedOrder ?? 0,
      updatedAt: r.updatedAt != null ? Math.round(Number(r.updatedAt)) : null,
    }))
  } finally {
    client.release()
  }
}

export async function getNota(id) {
  const client = await getPool().connect()
  try {
    const res = await client.query(
      `SELECT id, title, content, tags, pinned, pinned_order AS "pinnedOrder",
              EXTRACT(EPOCH FROM updated_at) * 1000 AS "updatedAt"
       FROM aw_notas WHERE id = $1`,
      [id]
    )
    const r = res.rows[0]
    if (!r) return null
    return {
      id: r.id,
      title: r.title ?? "",
      content: r.content ?? "",
      tags: Array.isArray(r.tags) ? r.tags : [],
      pinned: !!r.pinned,
      pinnedOrder: r.pinnedOrder ?? 0,
      updatedAt: r.updatedAt != null ? Math.round(Number(r.updatedAt)) : null,
    }
  } finally {
    client.release()
  }
}

export async function insertNota(item) {
  const client = await getPool().connect()
  try {
    const tags = Array.isArray(item.tags) ? item.tags : []
    const pinned = !!item.pinned
    const pinnedOrder = item.pinnedOrder ?? 0
    await client.query(
      `INSERT INTO aw_notas (id, title, content, tags, pinned, pinned_order, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [item.id, item.title ?? "", item.content ?? "", JSON.stringify(tags), pinned, pinnedOrder]
    )
    return (await getNota(item.id)) || item
  } finally {
    client.release()
  }
}

export async function updateNota(id, patch) {
  const client = await getPool().connect()
  try {
    const updates = ["updated_at = NOW()"]
    const values = []
    let i = 1
    if (patch.title !== undefined) {
      updates.push(`title = $${i++}`)
      values.push(patch.title)
    }
    if (patch.content !== undefined) {
      updates.push(`content = $${i++}`)
      values.push(patch.content)
    }
    if (patch.tags !== undefined) {
      updates.push(`tags = $${i++}`)
      values.push(JSON.stringify(Array.isArray(patch.tags) ? patch.tags : []))
    }
    if (patch.pinned !== undefined) {
      updates.push(`pinned = $${i++}`)
      values.push(!!patch.pinned)
    }
    if (patch.pinnedOrder !== undefined) {
      updates.push(`pinned_order = $${i++}`)
      values.push(patch.pinnedOrder)
    }
    values.push(id)
    await client.query(`UPDATE aw_notas SET ${updates.join(", ")} WHERE id = $${i}`, values)
    return (await getNota(id)) || null
  } finally {
    client.release()
  }
}

export async function deleteNota(id) {
  const client = await getPool().connect()
  try {
    await client.query("DELETE FROM aw_notas WHERE id = $1", [id])
  } finally {
    client.release()
  }
}

// ---- Notepad completed (checklist task completion map) ----
export async function getNotepadCompleted() {
  const client = await getPool().connect()
  try {
    const res = await client.query(
      `SELECT payload FROM aw_notepad_completed WHERE id = 1`
    )
    const r = res.rows[0]
    if (!r || !r.payload || typeof r.payload !== "object") return {}
    return r.payload
  } finally {
    client.release()
  }
}

export async function saveNotepadCompleted(payload) {
  const client = await getPool().connect()
  try {
    await client.query(
      `INSERT INTO aw_notepad_completed (id, payload, updated_at) VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET payload = $1, updated_at = NOW()`,
      [JSON.stringify(payload || {})]
    )
    return payload
  } finally {
    client.release()
  }
}

// ---- Custom checklists ----
export async function listCustomChecklists() {
  const client = await getPool().connect()
  try {
    const res = await client.query(
      `SELECT id, name, items FROM aw_custom_checklists
       ORDER BY CASE id WHEN 'infra' THEN 0 WHEN 'fluxo' THEN 1 ELSE 2 END, created_at DESC NULLS LAST`
    )
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name ?? "",
      items: Array.isArray(r.items) ? r.items : [],
    }))
  } finally {
    client.release()
  }
}

export async function insertCustomChecklist(item) {
  const client = await getPool().connect()
  try {
    await client.query(
      `INSERT INTO aw_custom_checklists (id, name, items) VALUES ($1, $2, $3)`,
      [item.id, item.name, JSON.stringify(item.items || [])]
    )
    return item
  } finally {
    client.release()
  }
}

export async function updateCustomChecklist(id, patch) {
  const client = await getPool().connect()
  try {
    const updates = []
    const values = []
    let i = 1
    if (patch.name !== undefined) {
      updates.push(`name = $${i++}`)
      values.push(patch.name)
    }
    if (patch.items !== undefined) {
      updates.push(`items = $${i++}`)
      values.push(JSON.stringify(Array.isArray(patch.items) ? patch.items : []))
    }
    if (updates.length === 0) return (await listCustomChecklists()).find((c) => c.id === id) || null
    values.push(id)
    await client.query(`UPDATE aw_custom_checklists SET ${updates.join(", ")} WHERE id = $${i}`, values)
    return (await listCustomChecklists()).find((c) => c.id === id) || null
  } finally {
    client.release()
  }
}

export async function deleteCustomChecklist(id) {
  const client = await getPool().connect()
  try {
    await client.query("DELETE FROM aw_custom_checklists WHERE id = $1", [id])
  } finally {
    client.release()
  }
}

// ---- Fluxos ----
export async function listFluxos() {
  const client = await getPool().connect()
  try {
    const res = await client.query(`SELECT id, name, nodes, edges FROM aw_fluxos ORDER BY updated_at DESC`)
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name ?? "",
      nodes: Array.isArray(r.nodes) ? r.nodes : [],
      edges: Array.isArray(r.edges) ? r.edges : [],
    }))
  } finally {
    client.release()
  }
}

export async function insertFluxo(item) {
  const client = await getPool().connect()
  try {
    await client.query(
      `INSERT INTO aw_fluxos (id, name, nodes, edges) VALUES ($1, $2, $3, $4)`,
      [item.id, item.name, JSON.stringify(item.nodes || []), JSON.stringify(item.edges || [])]
    )
    return item
  } finally {
    client.release()
  }
}

export async function updateFluxo(id, patch) {
  const client = await getPool().connect()
  try {
    const updates = ["updated_at = NOW()"]
    const values = []
    let i = 1
    if (patch.name !== undefined) {
      updates.push(`name = $${i++}`)
      values.push(patch.name)
    }
    if (patch.nodes !== undefined) {
      updates.push(`nodes = $${i++}`)
      values.push(JSON.stringify(Array.isArray(patch.nodes) ? patch.nodes : []))
    }
    if (patch.edges !== undefined) {
      updates.push(`edges = $${i++}`)
      values.push(JSON.stringify(Array.isArray(patch.edges) ? patch.edges : []))
    }
    if (values.length === 0) return (await listFluxos()).find((f) => f.id === id) || null
    values.push(id)
    await client.query(`UPDATE aw_fluxos SET ${updates.join(", ")} WHERE id = $${i}`, values)
    return (await listFluxos()).find((f) => f.id === id) || null
  } finally {
    client.release()
  }
}

export async function deleteFluxo(id) {
  const client = await getPool().connect()
  try {
    await client.query("DELETE FROM aw_fluxos WHERE id = $1", [id])
  } finally {
    client.release()
  }
}

// ---- Mesa estado (uma linha, id=1) ----
export async function getMesaEstado() {
  const client = await getPool().connect()
  try {
    const res = await client.query("SELECT payload FROM aw_mesa_estado ORDER BY id LIMIT 1")
    const row = res.rows[0]
    if (!row || !row.payload) return { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 }, isLocked: false }
    const p = row.payload
    return {
      nodes: p.nodes ?? [],
      edges: p.edges ?? [],
      viewport: p.viewport ?? { x: 0, y: 0, zoom: 1 },
      isLocked: p.isLocked ?? false,
    }
  } finally {
    client.release()
  }
}

export async function saveMesaEstado(payload) {
  const client = await getPool().connect()
  try {
    await client.query(
      `UPDATE aw_mesa_estado SET payload = $1, updated_at = NOW() WHERE id = (SELECT id FROM aw_mesa_estado LIMIT 1)`,
      [JSON.stringify(payload)]
    )
    return payload
  } finally {
    client.release()
  }
}

// ---- Mesa sessoes (exportar filtro da mesa para o banco) ----
export async function listMesaSessoes() {
  const client = await getPool().connect()
  try {
    const res = await client.query(
      `SELECT id, name, category_id AS "categoryId", payload,
              EXTRACT(EPOCH FROM created_at) * 1000 AS "createdAt",
              EXTRACT(EPOCH FROM updated_at) * 1000 AS "updatedAt"
       FROM aw_mesa_sessoes ORDER BY updated_at DESC`
    )
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name ?? "",
      categoryId: r.categoryId ?? "",
      payload: r.payload ?? {},
      createdAt: Math.round(Number(r.createdAt)),
      updatedAt: Math.round(Number(r.updatedAt)),
    }))
  } finally {
    client.release()
  }
}

export async function getMesaSessao(id) {
  const client = await getPool().connect()
  try {
    const res = await client.query(
      `SELECT id, name, category_id AS "categoryId", payload,
              EXTRACT(EPOCH FROM created_at) * 1000 AS "createdAt",
              EXTRACT(EPOCH FROM updated_at) * 1000 AS "updatedAt"
       FROM aw_mesa_sessoes WHERE id = $1`,
      [id]
    )
    const r = res.rows[0]
    if (!r) return null
    return {
      id: r.id,
      name: r.name ?? "",
      categoryId: r.categoryId ?? "",
      payload: r.payload ?? {},
      createdAt: Math.round(Number(r.createdAt)),
      updatedAt: Math.round(Number(r.updatedAt)),
    }
  } finally {
    client.release()
  }
}

export async function insertMesaSessao(item) {
  const client = await getPool().connect()
  try {
    await client.query(
      `INSERT INTO aw_mesa_sessoes (id, name, category_id, payload)
       VALUES ($1, $2, $3, $4)`,
      [
        item.id,
        item.name ?? null,
        item.categoryId ?? "",
        JSON.stringify(item.payload ?? {}),
      ]
    )
    return item
  } finally {
    client.release()
  }
}

export async function deleteMesaSessao(id) {
  const client = await getPool().connect()
  try {
    await client.query("DELETE FROM aw_mesa_sessoes WHERE id = $1", [id])
  } finally {
    client.release()
  }
}

// ---- Pomodoro settings (uma linha) ----
export async function getPomodoroSettings() {
  const client = await getPool().connect()
  try {
    const res = await client.query(
      `SELECT work_minutes AS "workMinutes", short_break_minutes AS "shortBreakMinutes",
              long_break_minutes AS "longBreakMinutes", long_break_after_cycles AS "longBreakAfterCycles"
       FROM aw_pomodoro_settings LIMIT 1`
    )
    const row = res.rows[0]
    if (!row)
      return {
        workMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakAfterCycles: 4,
      }
    return {
      workMinutes: row.workMinutes ?? 25,
      shortBreakMinutes: row.shortBreakMinutes ?? 5,
      longBreakMinutes: row.longBreakMinutes ?? 15,
      longBreakAfterCycles: row.longBreakAfterCycles ?? 4,
    }
  } finally {
    client.release()
  }
}

export async function savePomodoroSettings(settings) {
  const client = await getPool().connect()
  try {
    await client.query(
      `UPDATE aw_pomodoro_settings SET
        work_minutes = $1, short_break_minutes = $2, long_break_minutes = $3, long_break_after_cycles = $4,
        updated_at = NOW()
       WHERE id = (SELECT id FROM aw_pomodoro_settings LIMIT 1)`,
      [
        settings.workMinutes ?? 25,
        settings.shortBreakMinutes ?? 5,
        settings.longBreakMinutes ?? 15,
        settings.longBreakAfterCycles ?? 4,
      ]
    )
    return settings
  } finally {
    client.release()
  }
}
