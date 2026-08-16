'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { CalendarClock, Plus, MoreHorizontal, Pencil, Trash2, Check, Phone, Mail, Users as UsersIcon, ListTodo, UserCog, RefreshCw } from 'lucide-react'
import { useEntityList, useEntity, useCreateEntity, useUpdateEntity } from '@/hooks/use-entity'
import { useModuleStore } from '@/stores/module-store'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { DetailDrawer } from '@/components/shared/detail-drawer'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ViewToggle } from '@/components/shared/view-toggle'
import { BulkActionBar, BulkAssignDialog, BulkStatusDialog, BulkDeleteDialog, useBulkAction } from '@/components/shared/bulk-actions'
import { ExportButton } from '@/components/shared/export-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FOLLOWUP_STATUSES, FOLLOWUP_TYPES, FOLLOWUP_PRIORITIES } from '@/lib/constants'
import { formatDate, formatRelative } from '@/lib/utils'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { FollowUpsKanban } from './kanban'
import { useAuth } from '@/hooks/use-auth'

type FollowUp = any

const TYPE_ICON: Record<string, React.ReactNode> = {
  CALL: <Phone className="h-3.5 w-3.5" />,
  EMAIL: <Mail className="h-3.5 w-3.5" />,
  MEETING: <UsersIcon className="h-3.5 w-3.5" />,
  TASK: <ListTodo className="h-3.5 w-3.5" />,
  OTHER: <ListTodo className="h-3.5 w-3.5" />,
}

export function FollowUpsModule() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { selectedId, select } = useModuleStore()
  const viewMode = useModuleStore((s) => s.viewModes[s.active] ?? 'list')
  const { user } = useAuth()
  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES_MANAGER'

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkAssign, setBulkAssign] = useState(false)
  const [bulkStatus, setBulkStatus] = useState(false)
  const [bulkDelete, setBulkDelete] = useState(false)
  const bulk = useBulkAction('follow-ups')

  const { data, isLoading, error, refetch } = useEntityList<FollowUp>('follow-ups', {
    page, pageSize: 10, status: statusFilter, type: typeFilter,
  })

  const columns: ColumnDef<FollowUp>[] = [
    {
      id: 'title',
      header: 'Task',
      cell: ({ row }) => {
        const f = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              {TYPE_ICON[f.type] ?? <ListTodo className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{f.title}</p>
              <p className="truncate text-xs text-muted-foreground">{f.customer?.company ?? f.lead?.company ?? 'General'}</p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => <span className="text-xs capitalize text-muted-foreground">{row.original.type.toLowerCase()}</span>,
    },
    {
      id: 'priority',
      header: 'Priority',
      cell: ({ row }) => (
        <StatusBadge
          label={FOLLOWUP_PRIORITIES[row.original.priority]?.label ?? row.original.priority}
          className={FOLLOWUP_PRIORITIES[row.original.priority]?.color}
        />
      ),
    },
    {
      id: 'dueDate',
      header: 'Due',
      cell: ({ row }) => {
        const d = new Date(row.original.dueDate)
        const isOverdue = d < new Date() && row.original.status === 'PENDING'
        return (
          <span className={`text-xs ${isOverdue ? 'font-medium text-rose-600' : 'text-muted-foreground'}`}>
            {formatRelative(d)}
          </span>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge
          label={FOLLOWUP_STATUSES[row.original.status]?.label ?? row.original.status}
          className={FOLLOWUP_STATUSES[row.original.status]?.color}
        />
      ),
    },
    {
      id: 'assignee',
      header: 'Assignee',
      cell: ({ row }) => <span className="text-xs">{row.original.assignee?.name ?? '—'}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {row.original.status === 'PENDING' && (
              <DropdownMenuItem onClick={async () => {
                const res = await fetch(`/api/follow-ups/${row.original.id}`, {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'DONE' }),
                })
                if (res.ok) { toast.success('Marked as done'); refetch() }
              }}>
                <Check className="mr-2 h-3.5 w-3.5" /> Mark as done
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => { select(row.original.id); setEditing(true) }}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteId(row.original.id)}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Follow-ups"
        description="Schedule calls, meetings, and tasks with customers and leads"
        icon={<CalendarClock className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle />
            <ExportButton entity="follow-ups" filters={{ status: statusFilter, type: typeFilter }} />
            <Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Follow-up</Button>
          </div>
        }
      />

      {viewMode === 'kanban' ? (
        <FollowUpsKanban />
      ) : (
        <>
          <BulkActionBar
            selectedCount={selectedIds.length}
            totalCount={data?.total ?? 0}
            onSelectAll={() => setSelectedIds(data?.data?.map((c: any) => c.id) ?? [])}
            onClear={() => setSelectedIds([])}
            actions={[
              ...(canManage ? [{
                id: 'assign', label: 'Assign', icon: <UserCog className="h-3.5 w-3.5" />,
                onClick: () => setBulkAssign(true),
              }] : []),
              {
                id: 'status', label: 'Change status', icon: <RefreshCw className="h-3.5 w-3.5" />,
                onClick: () => setBulkStatus(true),
              },
              ...(canManage ? [{
                id: 'delete', label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />,
                variant: 'destructive' as const,
                onClick: () => setBulkDelete(true),
              }] : []),
            ]}
          />

          <DataTable
            data={data?.data ?? []}
            columns={columns}
            isLoading={isLoading}
            error={error?.message ?? null}
            onRetry={() => refetch()}
            searchPlaceholder="Search follow-ups…"
            onRowClick={(row) => select(row.id!)}
            pageSize={10}
            enableSelection
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            toolbar={
              <>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {Object.entries(FOLLOWUP_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {FOLLOWUP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            }
          />
        </>
      )}

      <BulkAssignDialog
        open={bulkAssign}
        onOpenChange={setBulkAssign}
        count={selectedIds.length}
        entityLabel="follow-up"
        onConfirm={async (userId) => {
          const r = await bulk.execute('assign', selectedIds, userId)
          toast.success(`Assigned ${r.count} follow-ups`)
          setSelectedIds([])
        }}
      />

      <BulkStatusDialog
        open={bulkStatus}
        onOpenChange={setBulkStatus}
        count={selectedIds.length}
        entityLabel="follow-up"
        statusLabel="Status"
        statuses={Object.entries(FOLLOWUP_STATUSES).map(([value, c]) => ({ value, label: c.label, color: c.color }))}
        onConfirm={async (status) => {
          const r = await bulk.execute('status', selectedIds, status)
          toast.success(`Updated ${r.count} follow-ups`)
          setSelectedIds([])
        }}
      />

      <BulkDeleteDialog
        open={bulkDelete}
        onOpenChange={setBulkDelete}
        count={selectedIds.length}
        entityLabel="follow-up"
        onConfirm={async () => {
          const r = await bulk.execute('delete', selectedIds)
          toast.success(`Deleted ${r.count} follow-ups`)
          setSelectedIds([])
        }}
      />

      {selectedId && (
        <DetailDrawer open={!!selectedId} onOpenChange={(o) => !o && select(null)} title="Follow-up details" width="md">
          <FollowUpDetail id={selectedId} onEdit={() => setEditing(true)} />
        </DetailDrawer>
      )}

      <FollowUpFormDialog open={creating || editing} onOpenChange={(o) => { setCreating(false); setEditing(false) }} id={editing ? selectedId : null} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete follow-up?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteId) return
          const res = await fetch(`/api/follow-ups/${deleteId}`, { method: 'DELETE' })
          if (!res.ok) { toast.error('Failed'); return }
          toast.success('Deleted')
          setDeleteId(null)
          refetch()
        }}
      />
    </div>
  )
}

function FollowUpDetail({ id, onEdit }: { id: string; onEdit: () => void }) {
  const { data, isLoading } = useEntity<FollowUp>('follow-ups', id)
  const qc = useQueryClient()
  const f = data

  async function markDone() {
    const res = await fetch(`/api/follow-ups/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' }),
    })
    if (res.ok) { toast.success('Marked as done'); qc.invalidateQueries({ queryKey: ['follow-ups'] }) }
  }

  if (isLoading || !f) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <StatusBadge label={FOLLOWUP_STATUSES[f.status]?.label ?? f.status} className={FOLLOWUP_STATUSES[f.status]?.color} />
        <div className="flex gap-2">
          {f.status === 'PENDING' && <Button size="sm" onClick={markDone}><Check className="mr-2 h-3.5 w-3.5" /> Mark done</Button>}
          <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</Button>
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Title</p>
        <p className="mt-0.5 text-base font-semibold text-foreground">{f.title}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Type</p><p className="mt-0.5 text-sm text-foreground capitalize">{f.type.toLowerCase()}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</p><p className="mt-0.5"><StatusBadge label={FOLLOWUP_PRIORITIES[f.priority]?.label} className={FOLLOWUP_PRIORITIES[f.priority]?.color} /></p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Due date</p><p className="mt-0.5 text-sm text-foreground">{formatDate(f.dueDate)}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Completed</p><p className="mt-0.5 text-sm text-foreground">{formatDate(f.completedAt)}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Assignee</p><p className="mt-0.5 text-sm text-foreground">{f.assignee?.name ?? '—'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer</p><p className="mt-0.5 text-sm text-foreground">{f.customer?.name ?? '—'}</p></div>
      </div>
      {f.notes && (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Notes</p>
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">{f.notes}</p>
        </div>
      )}
    </div>
  )
}

function FollowUpFormDialog({ open, onOpenChange, id }: { open: boolean; onOpenChange: (o: boolean) => void; id: string | null }) {
  const isEdit = !!id
  const { data: existing } = useEntity<FollowUp>('follow-ups', id)
  const create = useCreateEntity('follow-ups', 'Follow-up created')
  const update = useUpdateEntity('follow-ups', id, 'Follow-up updated')

  const [form, setForm] = useState<Record<string, any>>({})
  const [loaded, setLoaded] = useState(false)

  if (isEdit && existing && !loaded) {
    setForm({
      title: existing.title, type: existing.type, priority: existing.priority, status: existing.status,
      dueDate: new Date(existing.dueDate).toISOString().split('T')[0],
      notes: existing.notes ?? '',
    })
    setLoaded(true)
  }
  if (!isEdit && Object.keys(form).length === 0) {
    setForm({ title: '', type: 'CALL', priority: 'MEDIUM', status: 'PENDING', dueDate: new Date().toISOString().split('T')[0], notes: '' })
  }

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })) }

  async function onSubmit() {
    if (isEdit) await update.mutateAsync(form)
    else await create.mutateAsync(form)
    setLoaded(false); setForm({})
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => { if (!o) { setLoaded(false); setForm({}) } onOpenChange(o) }}
      title={isEdit ? 'Edit Follow-up' : 'New Follow-up'}
      onSubmit={onSubmit}
      loading={create.isPending || update.isPending}
      submitLabel={isEdit ? 'Save' : 'Create'}
      size="md"
    >
      <Field label="Title *"><Input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} required /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Type">
          <Select value={form.type} onValueChange={(v) => set('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FOLLOWUP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={form.priority} onValueChange={(v) => set('priority', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(FOLLOWUP_PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(FOLLOWUP_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Due date"><Input type="date" value={form.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value)} /></Field>
      </div>
      <Field label="Notes"><Textarea rows={3} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
    </FormDialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
