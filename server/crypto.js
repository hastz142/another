/**
 * Criptografia AES-256-GCM para o campo senha.
 * A chave fica apenas no backend (variável de ambiente); nunca é exposta ao frontend.
 */

import crypto from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

/** Cache da chave derivada para não repetir getKey (e scryptSync) em cada decrypt. */
let cachedKey = null
let cachedEnvKey = null

/**
 * Garante que a chave tem 32 bytes (hex ou string truncada/expandida).
 * Resultado em cache para a mesma envKey (evita scryptSync repetido em listas grandes).
 * @param {string} envKey - ENCRYPTION_KEY do .env (64 hex ou 32 chars)
 * @returns {Buffer}
 */
function getKey(envKey) {
  if (!envKey || envKey.length < 16) {
    throw new Error("ENCRYPTION_KEY deve ter pelo menos 16 caracteres (ou 64 em hex).")
  }
  if (cachedEnvKey === envKey && cachedKey) {
    return cachedKey
  }
  let key
  if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
    key = Buffer.from(envKey, "hex")
  } else {
    key = crypto.scryptSync(envKey, "another-world-salt", KEY_LENGTH)
  }
  cachedEnvKey = envKey
  cachedKey = key
  return key
}

/**
 * Descriptografa um valor armazenado no formato iv:authTag:ciphertext (base64).
 * Se o valor não estiver no formato esperado, retorna o valor original (compatibilidade com dados em texto puro).
 * @param {string} encrypted - String no formato iv:tag:cipher ou texto puro
 * @param {string} envKey - ENCRYPTION_KEY
 * @returns {string}
 */
export function decrypt(encrypted, envKey) {
  if (!encrypted || typeof encrypted !== "string") return ""
  const parts = encrypted.split(":")
  if (parts.length !== 3) {
    return encrypted
  }
  try {
    const key = getKey(envKey)
    const iv = Buffer.from(parts[0], "base64")
    const authTag = Buffer.from(parts[1], "base64")
    const ciphertext = Buffer.from(parts[2], "base64")
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
    decipher.setAuthTag(authTag)
    return decipher.update(ciphertext) + decipher.final("utf8")
  } catch {
    return encrypted
  }
}

/**
 * Criptografa um valor em texto puro para armazenar no banco (formato iv:authTag:ciphertext em base64).
 * @param {string} plain - Senha em texto puro
 * @param {string} envKey - ENCRYPTION_KEY
 * @returns {string}
 */
export function encrypt(plain, envKey) {
  if (!plain || typeof plain !== "string") return ""
  const key = getKey(envKey)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":")
}
