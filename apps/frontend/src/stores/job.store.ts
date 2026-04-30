import { create } from 'zustand'
import { api } from '@/lib/axios'
import type { PaginationMeta } from '@/hooks/use-paginated-api'

export interface UserRef {
  id: string
  fullName: string
  city?: string
  isAvailable?: boolean
}

export interface JobData {
  id: string
  caseName: string
  duration: number
  locationType: 'PHYSICAL' | 'REMOTE'
  locationCity?: string
  status: 'NEW' | 'ASSIGNED' | 'TRANSCRIBED' | 'REVIEWED' | 'COMPLETED'
  reporter?: UserRef
  editor?: UserRef
  createdAt: string
}

export interface PaymentData {
  id: string
  assignmentType: 'REPORTER' | 'EDITOR'
  rate: number
  amount: number
  durationUsed?: number
  status: 'PENDING' | 'PAID'
  createdAt: string
  user: UserRef
}

export interface JobLog {
  id: string
  fromStatus: string | null
  toStatus: string
  note: string | null
  createdAt: string
  changedByUser: UserRef
}

interface JobState {
  jobs: JobData[]
  meta: PaginationMeta | null
  isLoading: boolean
  error: string | null

  selectedJob: JobData | null
  jobPayments: PaymentData[]
  jobLogs: JobLog[]
  detailLoading: boolean
  detailError: string | null

  fetchJobs: (page: number, limit?: number) => Promise<void>
  fetchJobById: (id: string) => Promise<void>
  fetchJobPayments: (id: string) => Promise<void>
  fetchJobLogs: (id: string) => Promise<void>
  createJob: (data: any) => Promise<void>
  assignReporter: (id: string, reporterId: string, force: boolean) => Promise<void>
  assignEditor: (id: string, editorId: string) => Promise<void>
  updateJobStatus: (id: string, status: string) => Promise<void>
  clearSelectedJob: () => void
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  meta: null,
  isLoading: true,
  error: null,

  selectedJob: null,
  jobPayments: [],
  jobLogs: [],
  detailLoading: true,
  detailError: null,

  fetchJobs: async (page: number, limit: number = 10) => {
    set({ isLoading: true, error: null })
    try {
      const urlObj = new URL('/jobs', 'http://localhost')
      urlObj.searchParams.set('page', page.toString())
      urlObj.searchParams.set('limit', limit.toString())
      const targetUrl = urlObj.pathname + urlObj.search

      const res = await api.get(targetUrl)
      set({ jobs: res.data.data || [], meta: res.data.meta || null, isLoading: false })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message ?? 'Failed to fetch jobs'
      set({ error: msg, isLoading: false })
    }
  },

  fetchJobById: async (id: string) => {
    set({ detailLoading: true, detailError: null })
    try {
      const { data } = await api.get(`/jobs/${id}`)
      set({ selectedJob: data.data, detailLoading: false })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message ?? 'Failed to load job detail'
      set({ detailError: msg, detailLoading: false })
    }
  },

  fetchJobPayments: async (id: string) => {
    try {
      const { data } = await api.get(`/jobs/${id}/payments`)
      set({ jobPayments: data.data || data })
    } catch (err) {
      console.error('Failed to load job payments', err)
    }
  },

  fetchJobLogs: async (id: string) => {
    try {
      const { data } = await api.get(`/jobs/${id}/logs`)
      set({ jobLogs: data.data || data })
    } catch (err) {
      console.error('Failed to load job logs', err)
    }
  },

  createJob: async (data: any) => {
    await api.post('/jobs', data)
  },

  assignReporter: async (id: string, reporterId: string, force: boolean) => {
    await api.post(`/jobs/${id}/assign-reporter`, { reporterId, force })
  },

  assignEditor: async (id: string, editorId: string) => {
    await api.post(`/jobs/${id}/assign-editor`, { editorId })
  },

  updateJobStatus: async (id: string, status: string) => {
    await api.patch(`/jobs/${id}/status`, { status })
  },

  clearSelectedJob: () => {
    set({ selectedJob: null, jobPayments: [], jobLogs: [], detailError: null })
  }
}))
