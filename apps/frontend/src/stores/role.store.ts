import { create } from 'zustand'
import { api } from '@/lib/axios'
import type { PaginationMeta } from '@/hooks/use-paginated-api'

export interface Permission {
  id: string
  name: string
  description: string
}

export interface RoleData {
  id: string
  name: string
  description: string
  isSystem: boolean
  permissions: Permission[]
  createdAt: string
}

interface RoleState {
  roles: RoleData[]
  allPermissions: Permission[]
  meta: PaginationMeta | null
  isLoading: boolean
  error: string | null
  selectedRole: RoleData | null
  detailLoading: boolean
  detailError: string | null

  fetchRoles: (page: number, limit?: number) => Promise<void>
  fetchRoleById: (id: string) => Promise<void>
  fetchAllPermissions: () => Promise<void>
  createRole: (data: any) => Promise<void>
  updateRole: (id: string, data: any) => Promise<void>
  deleteRole: (id: string) => Promise<void>
  clearSelectedRole: () => void
}

export const useRoleStore = create<RoleState>((set) => ({
  roles: [],
  allPermissions: [],
  meta: null,
  isLoading: true,
  error: null,
  selectedRole: null,
  detailLoading: true,
  detailError: null,

  fetchRoles: async (page: number, limit: number = 10) => {
    set({ isLoading: true, error: null })
    try {
      const urlObj = new URL('/roles', 'http://localhost')
      urlObj.searchParams.set('page', page.toString())
      urlObj.searchParams.set('limit', limit.toString())
      const targetUrl = urlObj.pathname + urlObj.search

      const res = await api.get(targetUrl)
      set({ roles: res.data.data || [], meta: res.data.meta || null, isLoading: false })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message ?? 'Failed to fetch roles'
      set({ error: msg, isLoading: false })
    }
  },

  fetchRoleById: async (id: string) => {
    set({ detailLoading: true, detailError: null })
    try {
      const { data } = await api.get(`/roles/${id}`)
      set({ selectedRole: data.data, detailLoading: false })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message ?? 'Failed to load role detail'
      set({ detailError: msg, detailLoading: false })
    }
  },

  fetchAllPermissions: async () => {
    try {
      const { data } = await api.get('/roles/permissions')
      set({ allPermissions: data.data || data })
    } catch (err) {
      console.error('Failed to load permissions', err)
    }
  },

  createRole: async (data: any) => {
    await api.post('/roles', data)
  },

  updateRole: async (id: string, data: any) => {
    const res = await api.patch(`/roles/${id}`, data)
    set({ selectedRole: res.data.data })
  },

  deleteRole: async (id: string) => {
    await api.delete(`/roles/${id}`)
  },

  clearSelectedRole: () => {
    set({ selectedRole: null, detailError: null })
  }
}))
