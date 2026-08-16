'use client'

import { Suspense } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { ErrorBoundary } from '@/components/error-boundary'

export default function Home() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <AppShell />
      </Suspense>
    </ErrorBoundary>
  )
}
