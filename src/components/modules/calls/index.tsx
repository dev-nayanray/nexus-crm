'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Phone, Plus, MoreHorizontal, Trash2, ExternalLink, PhoneIncoming, PhoneOutgoing, MessageSquare } from 'lucide-react'
import { useEntityList, useEntity, useCreateEntity } from '@/hooks/use-entity'
import { useModuleStore } from '@/stores/module-store'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { DetailDrawer } from '@/components/shared/detail-drawer'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CALL_TYPES, CALL_STATUSES } from '@/lib/constants'
import { formatDateTime, formatDuration, formatRelative } from '@/lib/utils'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'

type Call = any

export function CallsModule() {
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [creating, setCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { selectedId, select } = useModuleStore()

  const { data, isLoading, error, refetch } = useEntityList<Call>('calls', {
    page: 1, pageSize: 10, type: typeFilter, status: statusFilter,
  })

  const columns: ColumnDef<Call>[] = [
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${row.original.type === 'CALL' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>
            {row.original.type === 'CALL' ? <Phone className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">{row.original.direction === 'INBOUND' ? <PhoneIncoming className="inline h-3 w-3 mr-1" /> : <PhoneOutgoing className="inline h-3 w-3 mr-1" />}{CALL_TYPES[row.original.type]?.label ?? row.original.type}</p>
            {row.original.duration > 0 && <p className="text-[11px] text-muted-foreground">{formatDuration(row.original.duration)}</p>}
          </div>
        </div>
      ),
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: ({ row }) => (
        <div className="max-w-xs">
          <p className="truncate text-sm text-foreground">{row.original.subject ?? '—'}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.notes ?? ''}</p>
        </div>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-foreground">{row.original.customer?.name ?? row.original.lead?.name ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.customer?.company ?? row.original.lead?.company ?? ''}</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge label={CALL_STATUSES[row.original.status]?.label ?? row.original.status} className={CALL_STATUSES[row.original.status]?.color} />
      ),
    },
    { id: 'user', header: 'Logged by', cell: ({ row }) => <span className="text-xs">{row.original.user?.name ?? '—'}</span> },
    { id: 'startedAt', header: 'When', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.startedAt)}</span> },
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
            <DropdownMenuItem onClick={() => select(row.original.id)}><ExternalLink className="mr-2 h-3.5 w-3.5" /> View</DropdownMenuItem>
            <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteId(row.original.id)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calls & Messages"
        description="Log every call and message with customers and leads"
        icon={<Phone className="h-5 w-5" />}
        actions={<Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Log Call</Button>}
      />
      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        error={error?.message ?? null}
        onRetry={() => refetch()}
        searchPlaceholder="Search by subject, notes…"
        onRowClick={(row) => select(row.id!)}
        pageSize={10}
        toolbar={
          <>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(CALL_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(CALL_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />
      {selectedId && (
        <DetailDrawer open={!!selectedId} onOpenChange={(o) => !o && select(null)} title="Call details" width="md">
          <CallDetail id={selectedId} />
        </DetailDrawer>
      )}
      <CallFormDialog open={creating} onOpenChange={setCreating} />
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete call log?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteId) return
          const res = await fetch(`/api/calls/${deleteId}`, { method: 'DELETE' })
          if (!res.ok) { toast.error('Failed'); return }
          toast.success('Deleted')
          setDeleteId(null)
          refetch()
        }}
      />
    </div>
  )
}

function CallDetail({ id }: { id: string }) {
  const { data, isLoading } = useEntity<Call>('calls', id)
  const c = data
  if (isLoading || !c) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />)}</div>
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <StatusBadge label={CALL_STATUSES[c.status]?.label ?? c.status} className={CALL_STATUSES[c.status]?.color} />
        <span className="text-xs text-muted-foreground">{formatDuration(c.duration)}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4">
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Type</p><p className="mt-0.5 text-sm text-foreground">{CALL_TYPES[c.type]?.label ?? c.type}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Direction</p><p className="mt-0.5 text-sm capitalize text-foreground">{c.direction.toLowerCase()}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer</p><p className="mt-0.5 text-sm text-foreground">{c.customer?.name ?? '—'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Lead</p><p className="mt-0.5 text-sm text-foreground">{c.lead?.name ?? '—'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Logged by</p><p className="mt-0.5 text-sm text-foreground">{c.user?.name ?? '—'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Started at</p><p className="mt-0.5 text-sm text-foreground">{formatDateTime(c.startedAt)}</p></div>
      </div>
      {c.subject && <div><p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Subject</p><p className="text-sm font-medium text-foreground">{c.subject}</p></div>}
      {c.notes && <div><p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</p><p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">{c.notes}</p></div>}
    </div>
  )
}

function CallFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateEntity('calls', 'Call logged')

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'list', { pageSize: 100 }],
    queryFn: async () => { const r = await fetch('/api/customers?pageSize=100'); return r.json() },
  })
  const { data: leadsData } = useQuery({
    queryKey: ['leads', 'list', { pageSize: 100 }],
    queryFn: async () => { const r = await fetch('/api/leads?pageSize=100'); return r.json() },
  })

  const [form, setForm] = useState<Record<string, any>>({
    type: 'CALL', direction: 'OUTBOUND', status: 'COMPLETED',
    duration: 0, subject: '', notes: '', customerId: '', leadId: '',
    startedAt: new Date().toISOString().slice(0, 16),
  })

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })) }

  async function onSubmit() {
    const payload = { ...form, duration: Number(form.duration), customerId: form.customerId || null, leadId: form.leadId || null, startedAt: form.startedAt ? new Date(form.startedAt).toISOString() : null }
    await create.mutateAsync(payload)
    setForm({ type: 'CALL', direction: 'OUTBOUND', status: 'COMPLETED', duration: 0, subject: '', notes: '', customerId: '', leadId: '', startedAt: new Date().toISOString().slice(0, 16) })
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => { if (!o) { setForm({ type: 'CALL', direction: 'OUTBOUND', status: 'COMPLETED', duration: 0, subject: '', notes: '', customerId: '', leadId: '', startedAt: new Date().toISOString().slice(0, 16) }) }; onOpenChange(o) }}
      title="Log Call / Message"
      onSubmit={onSubmit}
      loading={create.isPending}
      submitLabel="Log call"
      size="lg"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Type">
          <Select value={form.type} onValueChange={(v) => set('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CALL_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Direction">
          <Select value={form.direction} onValueChange={(v) => set('direction', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="INBOUND">Inbound</SelectItem>
              <SelectItem value="OUTBOUND">Outbound</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CALL_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Duration (seconds)"><Input type="number" value={form.duration} onChange={(e) => set('duration', e.target.value)} /></Field>
        <Field label="Started at"><Input type="datetime-local" value={form.startedAt} onChange={(e) => set('startedAt', e.target.value)} /></Field>
        <Field label="Customer">
          <Select value={form.customerId} onValueChange={(v) => set('customerId', v)}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {customersData?.data?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.company})</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Lead">
        <Select value={form.leadId} onValueChange={(v) => set('leadId', v)}>
          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {leadsData?.data?.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.company})</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Subject"><Input value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="Call subject…" /></Field>
      <Field label="Notes"><Textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
    </FormDialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>
}
