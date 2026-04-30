import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/axios'

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface UsePaginatedApiState<T> {
  data: T[]
  meta: PaginationMeta | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePaginatedApi<T>(
  baseUrl: string | null,
  page: number,
  limit: number = 10
): UsePaginatedApiState<T> {
  const [data, setData] = useState<T[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!baseUrl) {
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Append or update page & limit in the URL
      const urlObj = new URL(baseUrl, 'http://localhost') // dummy base
      urlObj.searchParams.set('page', page.toString())
      urlObj.searchParams.set('limit', limit.toString())
      
      const targetUrl = urlObj.pathname + urlObj.search

      const res = await api.get(targetUrl)
      
      // TransformInterceptor sets data to { success, data: Array, meta }
      setData(res.data.data || [])
      setMeta(res.data.meta || null)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message ?? 'Request failed'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [baseUrl, page, limit])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, meta, isLoading, error, refetch: fetchData }
}
