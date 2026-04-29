import { useEffect, useState } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import { useAuthStore } from './stores/auth.store'

export function App() {
  const initFromStorage = useAuthStore((s) => s.initFromStorage)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initFromStorage().finally(() => setReady(true))
  }, [initFromStorage])

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return <RouterProvider router={router} />
}
