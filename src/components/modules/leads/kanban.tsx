'use client'

import { useKanbanList, useMoveEntity } from '@/hooks/use-kanban'
import { KanbanBoard, KanbanColumn } from '@/components/shared/kanban-board'
import { SortableCard } from '@/components/shared/sortable-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { LeadScoreBadge } from '@/components/shared/lead-score-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LEAD_STAGES } from '@/lib/constants'
import { formatCurrency, initials } from '@/lib/utils'
import { useModuleStore } from '@/stores/module-store'
import { DollarSign, Calendar, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type Lead = any

const STAGE_DOT_COLORS: Record<string, string> = {
  NEW: 'bg-slate-400',
  CONTACTED: 'bg-sky-500',
  QUALIFIED: 'bg-violet-500',
  PROPOSAL: 'bg-amber-500',
  NEGOTIATION: 'bg-orange-500',
  WON: 'bg-emerald-500',
  LOST: 'bg-rose-500',
}

export function LeadsKanban() {
  const { data, isLoading, error } = useKanbanList<Lead>('leads')
  const { move } = useMoveEntity('leads', 'stage')
  const select = useModuleStore((s) => s.select)

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Object.keys(LEAD_STAGES).map((stage) => (
          <div key={stage} className="w-72 shrink-0 space-y-2">
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

  const columns: KanbanColumn<Lead>[] = Object.entries(LEAD_STAGES).map(([stage, config]) => ({
    id: stage,
    label: config.label,
    color: STAGE_DOT_COLORS[stage],
    items: items.filter((l) => l.stage === stage),
  }))

  // Compute total value per column
  const columnTotals = Object.fromEntries(
    Object.entries(LEAD_STAGES).map(([stage]) => [
      stage,
      items.filter((l) => l.stage === stage).reduce((sum, l) => sum + (l.value ?? 0), 0),
    ])
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span>Drag cards between columns to update lead stage</span>
        <span className="font-medium">{items.length} leads total</span>
      </div>
      <KanbanBoard
        columns={columns}
        onDrop={(itemId, _from, to) => {
          const stage = LEAD_STAGES[to]
          move(itemId, to, `Lead moved to ${stage?.label ?? to}`)
        }}
        renderCard={(lead) => (
          <SortableCard id={lead.id}>
            <div
              className="cursor-pointer space-y-2"
              onClick={(e) => {
                // Prevent drag from triggering click
                if ((e.target as HTMLElement).closest('[data-dnd-draggable]')) return
                select(lead.id)
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-sky-50 text-[10px] font-medium text-sky-700">
                      {initials(lead.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{lead.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{lead.company}</p>
                  </div>
                </div>
                {lead.value > 0 && (
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                      <DollarSign className="h-3 w-3" />
                      {(lead.value / 1000).toFixed(1)}k
                    </div>
                    <LeadScoreBadge lead={lead} />
                  </div>
                )}
                {lead.value === 0 && <LeadScoreBadge lead={lead} />}
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{lead.owner?.name ?? 'Unassigned'}</span>
                {lead.expectedCloseDate && (
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-2.5 w-2.5" />
                    {formatDate(lead.expectedCloseDate, { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <div className="h-1 flex-1 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${lead.probability}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{lead.probability}%</span>
              </div>
            </div>
          </SortableCard>
        )}
      />

      {/* Column totals footer */}
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
