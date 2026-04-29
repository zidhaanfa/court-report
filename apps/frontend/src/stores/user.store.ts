import { create } from 'zustand'
import { api } from '@/lib/axios'
import type { PaginationMeta } from '@/hooks/use-paginated-api'

interface Permission {
  id: string
  name: string
  description: string
}

interface Role {
  id: string
  name: string
  description: string
  isSystem: boolean
  permissions: Permission[]
}

interface UserData {
  id: string
  email: string
  fullName: string
  phone: string | null
  city: string | null
  isAvailable: boolean
  status: string
  roles: Role[]
  createdAt: string
  updatedAt: string
}

export interface UserDetailData extends UserData {
  permissions: string[]
}

interface UserState {
  users: UserData[]
  reporters: UserData[]
  editors: UserData[]
  meta: PaginationMeta | null
  isLoading: boolean
  error: string | null
  selectedUser: UserDetailData | null
  detailLoading: boolean
  detailError: string | null

  fetchUsers: (page: number, limit?: number) => Promise<void>
  fetchReporters: () => Promise<void>
  fetchEditors: () => Promise<void>
  fetchUserById: (id: string) => Promise<void>
  createUser: (data: any) => Promise<void>
  updateUser: (id: string, data: any) => Promise<void>
  assignRole: (userId: string, roleId: string) => Promise<void>
  removeRole: (userId: string, roleId: string) => Promise<void>
  clearSelectedUser: () => void
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  reporters: [],
  editors: [],
  meta: null,
  isLoading: true,
  error: null,
  selectedUser: null,
  detailLoading: true,
  detailError: null,

  fetchUsers: async (page: number, limit: number = 10) => {
    set({ isLoading: true, error: null })
    try {
      const urlObj = new URL('/users', 'http://localhost')
      urlObj.searchParams.set('page', page.toString())
      urlObj.searchParams.set('limit', limit.toString())
      const targetUrl = urlObj.pathname + urlObj.search

      const res = await api.get(targetUrl)
      set({ users: res.data.data || [], meta: res.data.meta || null, isLoading: false })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message ?? 'Failed to fetch users'
      set({ error: msg, isLoading: false })
    }
  },

  fetchReporters: async () => {
    try {
      const { data } = await api.get('/users/reporters')
      set({ reporters: data.data || data })
    } catch (err) {
      console.error('Failed to load reporters', err)
    }
  },

  fetchEditors: async () => {
    try {
      const { data } = await api.get('/users/editors')
      set({ editors: data.data || data })
    } catch (err) {
      console.error('Failed to load editors', err)
    }
  },

  fetchUserById: async (id: string) => {
    set({ detailLoading: true, detailError: null })
    try {
      const { data } = await api.get(`/users/${id}`)
      set({ selectedUser: data.data, detailLoading: false })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message ?? 'Failed to load user detail'
      set({ detailError: msg, detailLoading: false })
    }
  },

  createUser: async (data: any) => {
    await api.post('/users', data)
  },

  updateUser: async (id: string, data: any) => {
    const res = await api.patch(`/users/${id}`, data)
    set({ selectedUser: res.data.data })
  },

  assignRole: async (userId: string, roleId: string) => {
    await api.post(`/users/${userId}/roles`, { roleId })
  },

  removeRole: async (userId: string, roleId: string) => {
    await api.delete(`/users/${userId}/roles/${roleId}`)
  },

  clearSelectedUser: () => {
    set({ selectedUser: null, detailError: null })
  }
}))
