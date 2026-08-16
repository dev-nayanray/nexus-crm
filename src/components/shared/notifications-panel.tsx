'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Icons from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useModuleStore } from '@/stores/module-store'
import { type ModuleId } from '@/lib/constants'
import { formatRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: 'overdue_followup' | 'pending_payment' | 'low_stock' | 'new_lead' | 'unpaid_order'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  meta?: string
  module: string
  entityId?: string
  timestamp: string
}

const SEVERITY_STYLES = {
  high: { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  medium: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low: { dot: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
}

const TYPE_ICONS: Record<string, string> = {
  overdue_followup: 'CalendarClock',
  pending_payment: 'CreditCard',
  low_stock: 'PackageX',
  new_lead: 'Target',
  unpaid_order: 'ReceiptText',
}

export function NotificationsPanel() {
  const qc = useQueryClient()
  const setModule = useModuleStore((s) => s.set)
  const select = useModuleStore((s) => s.select)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications')
      if (!res.ok) throw new Error('Failed to load notifications')
      return res.json() as Promise<{
        notifications: Notification[]
        total: number
        counts: { high: number; medium: number; low: number }
      }>
    },
    refetchInterval: 60 * 1000, // refresh every minute
    staleTime: 30 * 1000,
  })

  const notifications = data?.notifications ?? []
  const counts = data?.counts ?? { high: 0, medium: 0, low: 0 }
  const totalCount = data?.total ?? 0

  function handleNotificationClick(n: Notification) {
    setModule(n.module as ModuleId)
    if (n.entityId) {
      setTimeout(() => select(n.entityId!), 50)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Icons.Bell className="h-4 w-4" />
          {totalCount > 0 && (
            <span className={cn(
              'absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white',
              counts.high > 0 ? 'bg-rose-500' : counts.medium > 0 ? 'bg-amber-500' : 'bg-sky-500'
            )}>
              {totalCount > 9 ? '9+' : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">{totalCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {counts.high > 0 && <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />{counts.high}</span>}
            {counts.medium > 0 && <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{counts.medium}</span>}
            {counts.low > 0 && <span className="flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-sky-500" />{counts.low}</span>}
          </div>
        </div>

        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icons.CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="mt-2 text-sm font-medium text-foreground">All caught up!</p>
              <p className="mt-0.5 text-xs text-muted-foreground">No pending notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const Icon = (Icons as any)[TYPE_ICONS[n.type] ?? 'Bell'] ?? Icons.Bell
                const style = SEVERITY_STYLES[n.severity]
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', style.bg, style.text)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{n.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{n.description}</p>
                      {n.meta && <p className="mt-0.5 text-[10px] text-muted-foreground">{n.meta}</p>}
                    </div>
                    <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', style.dot)} />
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                qc.invalidateQueries({ queryKey: ['notifications'] })
              }}
            >
              <Icons.RefreshCw className="mr-1.5 h-3 w-3" />
              Refresh
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
