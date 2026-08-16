'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { History, ExternalLink } from 'lucide-react'
import { useEntityList, useEntity } from '@/hooks/use-entity'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { DetailDrawer } from '@/components/shared/detail-drawer'
import { useModuleStore } from '@/stores/module-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ACTIVITY_ACTIONS } from '@/lib/constants'
import { formatDateTime, formatRelative, initials } from '@/lib/utils'

type Activity = any

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-sky-50 text-sky-700 border-sky-200',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
  CONVERT: 'bg-violet-50 text-violet-700 border-violet-200',
  STATUS_CHANGE: 'bg-amber-50 text-amber-700 border-amber-200',
  LOGIN: 'bg-slate-50 text-slate-700 border-slate-200',
  LOGOUT: 'bg-slate-50 text-slate-700 border-slate-200',
}

export function ActivityLogsModule() {
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const { selectedId, select } = useModuleStore()

  const { data, isLoading, error, refetch } = useEntityList<Activity>('activity-logs', {
    page: 1, pageSize: 20, entity: entityFilter, action: actionFilter,
  })

  const columns: ColumnDef<Activity>[] = [
    {
      id: 'user',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-slate-100 text-[10px] text-slate-700">{initials(row.original.user?.name)}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-foreground">{row.original.user?.name ?? 'System'}</span>
        </div>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <Badge variant="outline" className={`text-xs ${ACTION_STYLES[row.original.action] ?? 'bg-slate-50 text-slate-700'}`}>
          {ACTIVITY_ACTIONS[row.original.action]?.label ?? row.original.action}
        </Badge>
      ),
    },
    {
      id: 'entity',
      header: 'Entity',
      cell: ({ row }) => (
        <div>
          <p className="text-xs font-medium text-foreground">{row.original.entity}</p>
          <p className="text-[10px] text-muted-foreground">{truncate(row.original.entityName, 30)}</p>
        </div>
      ),
    },
    {
      id: 'summary',
      header: 'Summary',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.summary}</span>,
    },
    {
      id: 'createdAt',
      header: 'When',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.createdAt)}</span>,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Activity Logs"
        description="Audit trail of all actions across the CRM"
        icon={<History className="h-5 w-5" />}
      />
      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        error={error?.message ?? null}
        onRetry={() => refetch()}
        searchPlaceholder="Search activity…"
        onRowClick={(row) => select(row.id!)}
        pageSize={20}
        toolbar={
          <>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {['CUSTOMER', 'LEAD', 'ORDER', 'QUOTATION', 'PAYMENT', 'PRODUCT', 'INVENTORY', 'PURCHASE_ORDER', 'FOLLOWUP', 'CALL', 'EMAIL', 'USER'].map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {Object.entries(ACTIVITY_ACTIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />
      {selectedId && (
        <DetailDrawer open={!!selectedId} onOpenChange={(o) => !o && select(null)} title="Activity Details" width="md">
          <ActivityDetail id={selectedId} />
        </DetailDrawer>
      )}
    </div>
  )
}

function ActivityDetail({ id }: { id: string }) {
  const { data, isLoading } = useEntity<Activity>('activity-logs', id)
  const a = data
  if (isLoading || !a) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />)}</div>
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4">
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">User</p><p className="mt-0.5 text-sm text-foreground">{a.user?.name ?? 'System'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">When</p><p className="mt-0.5 text-sm text-foreground">{formatDateTime(a.createdAt)}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Action</p><p className="mt-0.5"><Badge variant="outline" className={ACTION_STYLES[a.action]}>{ACTIVITY_ACTIONS[a.action]?.label ?? a.action}</Badge></p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Entity</p><p className="mt-0.5 text-sm text-foreground">{a.entity}{a.entityName ? ` · ${a.entityName}` : ''}</p></div>
      </div>
      <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Summary</p><p className="mt-0.5 text-sm text-foreground">{a.summary}</p></div>
      {a.metadata && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Metadata</p>
          <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-3 text-xs text-foreground">{a.metadata}</pre>
        </div>
      )}
    </div>
  )
}
