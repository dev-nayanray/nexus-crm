'use client'

import { useSession } from 'next-auth/react'

export function useAuth() {
  const { data: session, status, update } = useSession()
  const user = session?.user as
    | { id: string; email: string; name: string; role: 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP' }
    | undefined
  return {
    user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    update,
  }
}
