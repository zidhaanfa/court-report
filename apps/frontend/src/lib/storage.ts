import { encryptToken, decryptToken } from './crypto'

const KEYS = {
  ACCESS_TOKEN: 'cw_at',
  REFRESH_TOKEN: 'cw_rt',
  USER: 'cw_u',
} as const

// ── Token Storage ───────────────────────────────────────────────

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  const [encAccess, encRefresh] = await Promise.all([
    encryptToken(accessToken),
    encryptToken(refreshToken),
  ])
  localStorage.setItem(KEYS.ACCESS_TOKEN, encAccess)
  localStorage.setItem(KEYS.REFRESH_TOKEN, encRefresh)
}

export async function getAccessToken(): Promise<string | null> {
  const encrypted = localStorage.getItem(KEYS.ACCESS_TOKEN)
  if (!encrypted) return null
  return decryptToken(encrypted)
}

export async function getRefreshToken(): Promise<string | null> {
  const encrypted = localStorage.getItem(KEYS.REFRESH_TOKEN)
  if (!encrypted) return null
  return decryptToken(encrypted)
}

export function clearTokens(): void {
  localStorage.removeItem(KEYS.ACCESS_TOKEN)
  localStorage.removeItem(KEYS.REFRESH_TOKEN)
  localStorage.removeItem(KEYS.USER)
}

// ── User Storage (plain JSON — no secrets here) ─────────────────

export function saveUser(user: object): void {
  localStorage.setItem(KEYS.USER, JSON.stringify(user))
}

export function getUser<T>(): T | null {
  const raw = localStorage.getItem(KEYS.USER)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
