'use client'

import { useKanbanList, useMoveEntity } from '@/hooks/use-kanban'
import { KanbanBoard, KanbanColumn } from '@/components/shared/kanban-board'
import { SortableCard } from '@/components/shared/sortable-card'
import { QUOTATION_STATUSES } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useModuleStore } from '@/stores/module-store'
import { AlertCircle, FileText, Calendar } from 'lucide-react'

type Quotation = any

const STATUS_DOT_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-400',
  SENT: 'bg-sky-500',
  ACCEPTED: 'bg-emerald-500',
  REJECTED: 'bg-rose-500',
  EXPIRED: 'bg-zinc-400',
  CONVERTED: 'bg-violet-500',
}

export function QuotationsKanban() {
  const { data, isLoading, error } = useKanbanList<Quotation>('quotations')
  const { move } = useMoveEntity('quotations', 'status')
  const select = useModuleStore((s) => s.select)

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Object.keys(QUOTATION_STATUSES).map((s) => (
          <div key={s} className="w-72 shrink-0 space-y-2">
            <div className="h-9 animate-pulse rounded-lg bg-muted" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted/50" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-2 text-sm font-medium text-foreground">Failed to load kanban</p>
        <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  const items = data?.data ?? []

  const columns: KanbanColumn<Quotation>[] = Object.entries(QUOTATION_STATUSES).map(([status, config]) => ({
    id: status,
    label: config.label,
    color: STATUS_DOT_COLORS[status],
    items: items.filter((q) => q.status === status),
  }))

  const columnTotals = Object.fromEntries(
    Object.entries(QUOTATION_STATUSES).map(([s]) => [
      s,
      items.filter((q) => q.status === s).reduce((sum, q) => sum + (q.total ?? 0), 0),
    ])
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span>Drag cards between columns to update quotation status</span>
        <span className="font-medium">{items.length} quotations total</span>
      </div>
      <KanbanBoard
        columns={columns}
        onDrop={(itemId, _from, to) => {
          const config = QUOTATION_STATUSES[to]
          move(itemId, to, `Quotation marked as ${config?.label ?? to}`)
        }}
        renderCard={(q) => (
          <SortableCard id={q.id}>
            <div
              className="cursor-pointer space-y-2"
              onClick={() => select(q.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{q.number}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{q.subject}</p>
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {formatCurrency(q.total, q.currency)}
                </p>
              </div>

              <div>
                <p className="truncate text-[11px] font-medium text-foreground">{q.customer?.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{q.customer?.company}</p>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{q.owner?.name ?? '—'}</span>
                {q.validUntil && (
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-2.5 w-2.5" />
                    {formatDate(q.validUntil, { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 border-t border-border pt-1.5 text-[10px] text-muted-foreground">
                <FileText className="h-2.5 w-2.5" />
                <span>{q._count?.items ?? 0} item{(q._count?.items ?? 0) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </SortableCard>
        )}
      />

      <div className="flex gap-4 overflow-x-auto border-t border-border pt-3">
        {columns.map((col) => (
          <div key={col.id} className="w-72 shrink-0">
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">{col.label} total</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(columnTotals[col.id] ?? 0)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
