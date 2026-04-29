/**
 * Secure token encryption/decryption using Web Crypto API (AES-GCM).
 * Tokens are encrypted before being stored in localStorage.
 */

const APP_KEY = import.meta.env.VITE_CRYPTO_KEY || 'court-workflow-encrypt-key-2026'

// Derive a CryptoKey from the app passphrase using PBKDF2
async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(APP_KEY),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// Convert ArrayBuffer to base64 string for localStorage storage
function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

// Convert base64 string back to Uint8Array
function base64ToBuffer(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

/**
 * Encrypt a plain string value.
 * Returns a base64-encoded string containing: [salt(16) | iv(12) | ciphertext]
 */
export async function encryptToken(plaintext: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(salt)

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  )

  // Combine: salt | iv | ciphertext
  const combined = new Uint8Array(salt.length + iv.length + cipherBuffer.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(cipherBuffer), salt.length + iv.length)

  return bufferToBase64(combined.buffer)
}

/**
 * Decrypt a base64-encoded encrypted string back to plain text.
 * Returns null if decryption fails.
 */
export async function decryptToken(encrypted: string): Promise<string | null> {
  try {
    const combined = base64ToBuffer(encrypted)
    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const ciphertext = combined.slice(28)

    const key = await deriveKey(salt)

    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    )

    return new TextDecoder().decode(plainBuffer)
  } catch {
    return null
  }
}
