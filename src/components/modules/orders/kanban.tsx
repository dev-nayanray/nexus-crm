'use client'

import { useKanbanList, useMoveOrder } from '@/hooks/use-kanban'
import { KanbanBoard, KanbanColumn } from '@/components/shared/kanban-board'
import { SortableCard } from '@/components/shared/sortable-card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ORDER_STATUSES, PAYMENT_STATUS } from '@/lib/constants'
import { formatCurrency, formatDate, initials } from '@/lib/utils'
import { useModuleStore } from '@/stores/module-store'
import { AlertCircle, Truck, CheckCircle2 } from 'lucide-react'

type Order = any

const STATUS_DOT_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-400',
  CONFIRMED: 'bg-sky-500',
  PROCESSING: 'bg-amber-500',
  SHIPPED: 'bg-violet-500',
  DELIVERED: 'bg-emerald-500',
  CANCELLED: 'bg-rose-500',
  REFUNDED: 'bg-zinc-400',
}

export function OrdersKanban() {
  const { data, isLoading, error } = useKanbanList<Order>('orders')
  const { move } = useMoveOrder()
  const select = useModuleStore((s) => s.select)

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Object.keys(ORDER_STATUSES).map((s) => (
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

  const columns: KanbanColumn<Order>[] = Object.entries(ORDER_STATUSES).map(([status, config]) => ({
    id: status,
    label: config.label,
    color: STATUS_DOT_COLORS[status],
    items: items.filter((o) => o.status === status),
  }))

  // Compute column totals
  const columnTotals = Object.fromEntries(
    Object.entries(ORDER_STATUSES).map(([s]) => [
      s,
      items.filter((o) => o.status === s).reduce((sum, o) => sum + (o.total ?? 0), 0),
    ])
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span>Drag cards between columns to update order status</span>
        <span className="font-medium">{items.length} orders total</span>
      </div>
      <KanbanBoard
        columns={columns}
        onDrop={(itemId, _from, to) => move(itemId, to)}
        renderCard={(order) => (
          <SortableCard id={order.id}>
            <div
              className="cursor-pointer space-y-2"
              onClick={() => select(order.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{order.number}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{order.customer?.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{order.customer?.company}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-foreground">
                    {formatCurrency(order.total, order.currency)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{order.owner?.name ?? '—'}</span>
                <span>{formatDate(order.orderDate, { month: 'short', day: 'numeric' })}</span>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-1.5">
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                  order.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                  order.paymentStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-700' :
                  order.paymentStatus === 'UNPAID' ? 'bg-slate-50 text-slate-600' :
                  'bg-violet-50 text-violet-700'
                }`}>
                  {PAYMENT_STATUS[order.paymentStatus]?.label ?? order.paymentStatus}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {order._count?.items ?? 0} item{(order._count?.items ?? 0) !== 1 ? 's' : ''}
                </span>
              </div>

              {order.status === 'SHIPPED' && (
                <div className="flex items-center gap-1 text-[10px] text-violet-600">
                  <Truck className="h-2.5 w-2.5" /> Shipped {formatDate(order.shippedAt, { month: 'short', day: 'numeric' })}
                </div>
              )}
              {order.status === 'DELIVERED' && (
                <div className="flex items-center gap-1 text-[10px] text-emerald-600">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Delivered {formatDate(order.deliveredAt, { month: 'short', day: 'numeric' })}
                </div>
              )}
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
