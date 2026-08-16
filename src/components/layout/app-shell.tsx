'use client'

import { useAuth } from '@/hooks/use-auth'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { ModuleRouter } from '@/components/modules/module-router'
import { LoginForm } from '@/components/modules/auth/login-form'
import { RealtimeProvider } from '@/components/realtime-provider'
import { ErrorBoundary } from '@/components/error-boundary'
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AppShell() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading Nexus CRM…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return (
    <RealtimeProvider>
      <div className="flex min-h-screen bg-muted/20">
        {/* Sidebar — fixed on desktop */}
        <div className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
          <ErrorBoundary fallback={<SidebarErrorFallback />}>
            <Sidebar className="sticky top-0 h-screen" />
          </ErrorBoundary>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <ErrorBoundary fallback={<TopbarErrorFallback />}>
            <Topbar />
          </ErrorBoundary>
          <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
            <div className="mx-auto max-w-7xl animate-view-in">
              <ErrorBoundary fallback={<ModuleErrorFallback />}>
                <ModuleRouter />
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </RealtimeProvider>
  )
}

function SidebarErrorFallback() {
  return (
    <div className="flex h-screen w-64 flex-col items-center justify-center bg-sidebar p-4 text-sidebar-foreground">
      <p className="text-xs text-sidebar-foreground/60">Navigation error</p>
    </div>
  )
}

function TopbarErrorFallback() {
  return (
    <div className="flex h-16 items-center border-b border-border bg-background px-4">
      <p className="text-sm text-muted-foreground">Nexus CRM</p>
    </div>
  )
}

function ModuleErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground">Module failed to load</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        There was an error loading this module. Try refreshing the page.
      </p>
      <Button
        onClick={() => window.location.reload()}
        className="mt-5 gap-2"
        size="sm"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh page
      </Button>
    </div>
  )
}
