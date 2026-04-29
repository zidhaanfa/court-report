import { create } from 'zustand'
import { api } from '@/lib/axios'
import type { PaginationMeta } from '@/hooks/use-paginated-api'

export interface PaymentData {
  id: string
  jobId: string
  userId: string
  assignmentType: 'REPORTER' | 'EDITOR'
  rate: number
  amount: number
  durationUsed?: number
  status: 'PENDING' | 'PAID'
  createdAt: string
  updatedAt: string
  job?: {
    id: string
    caseName: string
    duration: number
  }
  user?: {
    id: string
    fullName: string
    email: string
  }
}

interface PaymentState {
  payments: PaymentData[]
  meta: PaginationMeta | null
  isLoading: boolean
  error: string | null

  fetchPayments: (endpoint: string, page: number, limit?: number) => Promise<void>
  markAsPaid: (id: string) => Promise<void>
}

export const usePaymentStore = create<PaymentState>((set) => ({
  payments: [],
  meta: null,
  isLoading: true,
  error: null,

  fetchPayments: async (endpoint: string, page: number, limit: number = 10) => {
    set({ isLoading: true, error: null })
    try {
      const urlObj = new URL(endpoint, 'http://localhost')
      urlObj.searchParams.set('page', page.toString())
      urlObj.searchParams.set('limit', limit.toString())
      const targetUrl = urlObj.pathname + urlObj.search

      const res = await api.get(targetUrl)
      set({ payments: res.data.data || [], meta: res.data.meta || null, isLoading: false })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message ?? 'Failed to fetch payments'
      set({ error: msg, isLoading: false })
    }
  },

  markAsPaid: async (id: string) => {
    await api.patch(`/payments/${id}/mark-paid`)
    // Normally you'd want to update the specific payment in the list or refetch.
    // We will update the status in the store directly to avoid a refetch
    set((state) => ({
      payments: state.payments.map((p) => 
        p.id === id ? { ...p, status: 'PAID' } : p
      )
    }))
  }
}))
