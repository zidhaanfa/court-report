import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/axios'

interface UseApiState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Simple data-fetching hook built on top of our axios instance.
 * Calls the endpoint on mount and provides refetch capability.
 */
export function useApi<T>(url: string | null): UseApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!url) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get(url)
      setData(res.data.data)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message ?? 'Request failed'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
