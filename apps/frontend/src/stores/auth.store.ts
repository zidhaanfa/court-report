import { create } from 'zustand'
import { api } from '../lib/axios'
import {
  saveTokens,
  getAccessToken,
  getRefreshToken,
  saveUser,
  getUser,
  clearTokens,
} from '../lib/storage'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  phone: string | null
  city: string | null
  isAvailable: boolean
  status: string
  roles: Array<{ 
    id: string; 
    name: string;
    permissions?: Array<{ id: string; name: string; description?: string }>;
  }>
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  initFromStorage: () => Promise<void>

  // Helpers
  hasRole: (role: string) => boolean
  hasPermission: (permission: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    const { accessToken, refreshToken, user } = data.data

    // Encrypt and save tokens
    await saveTokens(accessToken, refreshToken)
    saveUser(user)

    set({ user, isAuthenticated: true })
  },

  logout: async () => {
    try {
      const refreshToken = await getRefreshToken()
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken })
      }
    } catch {
      // Silent — always clear local state regardless
    } finally {
      clearTokens()
      set({ user: null, isAuthenticated: false })
    }
  },

  initFromStorage: async () => {
    try {
      const [accessToken, savedUser] = await Promise.all([
        getAccessToken(),
        Promise.resolve(getUser<AuthUser>()),
      ])

      if (accessToken && savedUser) {
        set({ user: savedUser, isAuthenticated: true })
      } else {
        clearTokens()
        set({ user: null, isAuthenticated: false })
      }
    } catch {
      clearTokens()
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  },

  hasRole: (role) => {
    const { user } = get()
    return user?.roles?.some((r) => r.name === role) ?? false
  },

  hasPermission: (permission) => {
    const { user } = get()
    if (!user) return false
    for (const role of user.roles) {
      if (role.permissions?.some(p => p.name === permission)) {
        return true
      }
    }
    return false
  },
}))
