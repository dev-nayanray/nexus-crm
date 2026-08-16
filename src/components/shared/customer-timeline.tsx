'use client'

import { useQuery } from '@tanstack/react-query'
import * as Icons from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatRelative, formatDateTime } from '@/lib/utils'

interface CustomerTimelineProps {
  customerId: string
}

const TYPE_COLORS: Record<string, string> = {
  lead: 'bg-sky-50 text-sky-700',
  order: 'bg-violet-50 text-violet-700',
  quotation: 'bg-amber-50 text-amber-700',
  payment: 'bg-emerald-50 text-emerald-700',
  call: 'bg-sky-50 text-sky-700',
  email: 'bg-violet-50 text-violet-700',
  followup: 'bg-amber-50 text-amber-700',
  activity: 'bg-slate-50 text-slate-700',
}

export function CustomerTimeline({ customerId }: CustomerTimelineProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-timeline', customerId],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${customerId}/timeline`)
      if (!res.ok) throw new Error('Failed to load timeline')
      return res.json() as Promise<{
        customer: { id: string; name: string }
        events: Array<{
          id: string
          timestamp: string
          type: string
          icon: string
          title: string
          subtitle?: string
          meta?: string
          status?: string
          entityId: string
        }>
        total: number
      }>
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="py-4 text-center text-xs text-muted-foreground">Failed to load timeline</p>
  }

  const events = data?.events ?? []

  if (events.length === 0) {
    return (
      <div className="py-8 text-center">
        <Icons.History className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm font-medium text-foreground">No activity yet</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Activity will appear here as you interact with this customer.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <p className="mb-3 text-xs text-muted-foreground">{data?.total ?? 0} events · showing most recent 50</p>
      <div className="relative space-y-3 before:absolute before:left-4 before:top-2 before:h-full before:w-px before:bg-border">
        {events.map((event) => {
          const Icon = (Icons as any)[event.icon] ?? Icons.Circle
          return (
            <div key={event.id} className="relative flex gap-3 pb-2">
              <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background ${TYPE_COLORS[event.type] ?? 'bg-slate-50 text-slate-700'}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">{event.title}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground" title={formatDateTime(event.timestamp)}>
                    {formatRelative(event.timestamp)}
                  </span>
                </div>
                {event.subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{event.subtitle}</p>}
                <div className="mt-1 flex items-center gap-2">
                  {event.status && (
                    <StatusBadge label={event.status} className="text-[9px] bg-slate-100 text-slate-700 border-slate-200" />
                  )}
                  {event.meta && <span className="text-[10px] font-medium text-muted-foreground">{event.meta}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
