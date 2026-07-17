// SERVER-ONLY. AES-256-GCM encryption for at-rest secrets (BYO AI provider keys).
//
// This is the first encryption helper in the repo. Provider keys are the org's
// money, so we store them authenticated-encrypted and decrypt only in server
// code at call time. Never send a decrypted key back to the client.
//
// Format: "<iv-hex>:<ciphertext-hex>:<authTag-hex>"
// GCM (not CBC) because its 16-byte auth tag makes tampering with the stored
// ciphertext fail the decrypt hard instead of silently yielding a garbled key.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_BYTES = 12 // NIST-recommended IV length for GCM

// Master key from a server-only env var. 32 bytes, provided as 64 hex chars.
// Guard-throw like SUPABASE_SERVICE_ROLE_KEY (lib/supabase/admin.js) so a
// misconfigured deployment fails loudly rather than storing plaintext.
function getKey() {
  const hex = process.env.AI_ENCRYPTION_KEY
  if (!hex) throw new Error('AI_ENCRYPTION_KEY is not configured')
  const key = Buffer.from(hex, 'hex')
  if (key.length !== 32) {
    throw new Error('AI_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return key
}

export function encrypt(text) {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${ciphertext.toString('hex')}:${tag.toString('hex')}`
}

// Throws on any tampering or wrong key — a meaningful signal (usually a changed
// AI_ENCRYPTION_KEY). Callers decide how to surface it ("re-enter your key").
export function decrypt(payload) {
  if (typeof payload !== 'string') throw new Error('decrypt: expected string payload')
  const parts = payload.split(':')
  if (parts.length !== 3) throw new Error('decrypt: malformed ciphertext')
  const [ivHex, dataHex, tagHex] = parts
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ])
  return plaintext.toString('utf8')
}
