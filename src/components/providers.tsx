'use client'

import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState, useEffect } from 'react'
import { initVersionGuard } from '@/lib/version-guard'

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      })
  )

  // Clear stale cache on version change — prevents crashes from old persisted state
  useEffect(() => {
    initVersionGuard()
  }, [])

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
