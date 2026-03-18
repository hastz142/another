/**
 * Acesso ao banco (PostgreSQL / Supabase).
 * Uma única pool; usada por db.js (senhas) e db-another-world.js (aw_*).
 * Supabase: SSL ativado automaticamente quando DATABASE_URL contém "supabase".
 */

import pg from "pg"

const { Pool } = pg

let pool = null

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error("DATABASE_URL não definida em server/.env")
    }
    const useSsl =
      connectionString.includes("supabase") ||
      connectionString.includes("pooler.supabase.com")
    pool = new Pool({
      connectionString,
      ...(useSsl && { ssl: { rejectUnauthorized: false } }),
      max: 10,
      min: 1,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 10000,
    })
  }
  return pool
}

/**
 * Lista todas as senhas ordenadas por categoria (para exibição por grupos).
 * @returns {Promise<Array<{ id: number, categoria: string, servico: string, usuario: string, senha: string }>>}
 */
export async function listarSenhas() {
  const client = await getPool().connect()
  try {
    const res = await client.query(
      "SELECT id, categoria, servico, usuario, senha, COALESCE(grupo, '') AS grupo FROM senhas ORDER BY categoria, servico"
    )
    return res.rows
  } finally {
    client.release()
  }
}

/**
 * Insere uma nova senha (campo senha já deve vir criptografado).
 * @returns {Promise<{ id: number, categoria: string, servico: string, usuario: string }>}
 */
export async function inserirSenha(categoria, servico, usuario, senhaCriptografada, grupo = null) {
  const client = await getPool().connect()
  try {
    const res = await client.query(
      "INSERT INTO senhas (categoria, servico, usuario, senha, grupo) VALUES ($1, $2, $3, $4, $5) RETURNING id, categoria, servico, usuario",
      [categoria, servico || null, usuario || null, senhaCriptografada, grupo || null]
    )
    return res.rows[0]
  } finally {
    client.release()
  }
}

/**
 * Atualiza uma senha existente. Só altera campos que vêm em updates (não undefined).
 * @returns {Promise<{ id: number, categoria: string, servico: string, usuario: string } | null>}
 */
export async function atualizarSenha(id, updates) {
  const client = await getPool().connect()
  try {
    const setParts = []
    const values = []
    let i = 1
    if (updates.categoria !== undefined) {
      setParts.push(`categoria = $${i++}`)
      values.push(updates.categoria)
    }
    if (updates.servico !== undefined) {
      setParts.push(`servico = $${i++}`)
      values.push(updates.servico)
    }
    if (updates.usuario !== undefined) {
      setParts.push(`usuario = $${i++}`)
      values.push(updates.usuario)
    }
    if (updates.senhaCriptografada !== undefined) {
      setParts.push(`senha = $${i++}`)
      values.push(updates.senhaCriptografada)
    }
    if (updates.grupo !== undefined) {
      setParts.push(`grupo = $${i++}`)
      values.push(updates.grupo)
    }
    if (setParts.length === 0) {
      const res = await client.query("SELECT id, categoria, servico, usuario, COALESCE(grupo, '') AS grupo FROM senhas WHERE id = $1", [id])
      return res.rows[0] || null
    }
    values.push(id)
    await client.query(
      `UPDATE senhas SET ${setParts.join(", ")} WHERE id = $${i}`,
      values
    )
    const res = await client.query("SELECT id, categoria, servico, usuario, COALESCE(grupo, '') AS grupo FROM senhas WHERE id = $1", [id])
    return res.rows[0] || null
  } finally {
    client.release()
  }
}

/**
 * Apaga uma senha por id.
 */
export async function apagarSenha(id) {
  const client = await getPool().connect()
  try {
    await client.query("DELETE FROM senhas WHERE id = $1", [id])
  } finally {
    client.release()
  }
}
