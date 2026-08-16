'use client'

import { useKanbanList, useMoveEntity } from '@/hooks/use-kanban'
import { KanbanBoard, KanbanColumn } from '@/components/shared/kanban-board'
import { SortableCard } from '@/components/shared/sortable-card'
import { FOLLOWUP_STATUSES, FOLLOWUP_PRIORITIES, FOLLOWUP_TYPES } from '@/lib/constants'
import { formatRelative } from '@/lib/utils'
import { useModuleStore } from '@/stores/module-store'
import { AlertCircle, Phone, Mail, Users as UsersIcon, ListTodo, CalendarClock } from 'lucide-react'

type FollowUp = any

const STATUS_DOT_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-400',
  DONE: 'bg-emerald-500',
  SKIPPED: 'bg-zinc-400',
  OVERDUE: 'bg-rose-500',
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  CALL: <Phone className="h-3 w-3" />,
  EMAIL: <Mail className="h-3 w-3" />,
  MEETING: <UsersIcon className="h-3 w-3" />,
  TASK: <ListTodo className="h-3 w-3" />,
  OTHER: <ListTodo className="h-3 w-3" />,
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-rose-100 text-rose-700',
}

export function FollowUpsKanban() {
  const { data, isLoading, error } = useKanbanList<FollowUp>('follow-ups')
  const { move } = useMoveEntity('follow-ups', 'status')
  const select = useModuleStore((s) => s.select)

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Object.keys(FOLLOWUP_STATUSES).map((s) => (
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

  const columns: KanbanColumn<FollowUp>[] = Object.entries(FOLLOWUP_STATUSES).map(([status, config]) => ({
    id: status,
    label: config.label,
    color: STATUS_DOT_COLORS[status],
    items: items.filter((f) => f.status === status),
  }))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span>Drag cards between columns to update follow-up status</span>
        <span className="font-medium">{items.length} follow-ups total</span>
      </div>
      <KanbanBoard
        columns={columns}
        onDrop={(itemId, _from, to) => {
          const config = FOLLOWUP_STATUSES[to]
          move(itemId, to, `Follow-up marked as ${config?.label ?? to}`)
        }}
        renderCard={(f) => {
          const overdue = f.status === 'PENDING' && new Date(f.dueDate) < new Date()
          return (
            <SortableCard id={f.id}>
              <div
                className="cursor-pointer space-y-2"
                onClick={() => select(f.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${PRIORITY_COLORS[f.priority] ?? 'bg-slate-100 text-slate-700'}`}>
                      {TYPE_ICON[f.type] ?? <ListTodo className="h-3 w-3" />}
                    </div>
                    <p className="truncate text-xs font-semibold text-foreground">{f.title}</p>
                  </div>
                  <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${PRIORITY_COLORS[f.priority] ?? 'bg-slate-100 text-slate-700'}`}>
                    {FOLLOWUP_PRIORITIES[f.priority]?.label ?? f.priority}
                  </span>
                </div>

                <div className="text-[10px] text-muted-foreground">
                  <p className="truncate">{f.customer?.name ?? f.lead?.name ?? 'General'}</p>
                  <p className="truncate">{f.customer?.company ?? f.lead?.company ?? ''}</p>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-1.5 text-[10px]">
                  <span className="text-muted-foreground">{f.assignee?.name ?? '—'}</span>
                  <span className={`flex items-center gap-0.5 ${overdue ? 'font-medium text-rose-600' : 'text-muted-foreground'}`}>
                    <CalendarClock className="h-2.5 w-2.5" />
                    {formatRelative(f.dueDate)}
                  </span>
                </div>

                {overdue && (
                  <div className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-medium text-rose-700">
                    Overdue
                  </div>
                )}
              </div>
            </SortableCard>
          )
        }}
      />
    </div>
  )
}
