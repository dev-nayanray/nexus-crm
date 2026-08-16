'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Mail, Plus, MoreHorizontal, Trash2, ExternalLink } from 'lucide-react'
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
import { EMAIL_STATUSES } from '@/lib/constants'
import { formatDateTime, formatRelative, truncate } from '@/lib/utils'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'

type Email = any

export function EmailLogsModule() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [creating, setCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { selectedId, select } = useModuleStore()

  const { data, isLoading, error, refetch } = useEntityList<Email>('email-logs', {
    page: 1, pageSize: 10, status: statusFilter,
  })

  const columns: ColumnDef<Email>[] = [
    {
      id: 'subject',
      header: 'Email',
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className="truncate text-sm font-medium text-foreground">{row.original.subject}</p>
          <p className="truncate text-xs text-muted-foreground">To: {row.original.to}</p>
        </div>
      ),
    },
    { id: 'from', header: 'From', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.from}</span> },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => <span className="text-xs text-foreground">{row.original.customer?.name ?? row.original.lead?.name ?? '—'}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge label={EMAIL_STATUSES[row.original.status]?.label ?? row.original.status} className={EMAIL_STATUSES[row.original.status]?.color} />
      ),
    },
    { id: 'sentAt', header: 'Sent', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.sentAt)}</span> },
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
        title="Email Logs"
        description="Track emails sent to customers and leads"
        icon={<Mail className="h-5 w-5" />}
        actions={<Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Log Email</Button>}
      />
      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        error={error?.message ?? null}
        onRetry={() => refetch()}
        searchPlaceholder="Search by subject, recipient…"
        onRowClick={(row) => select(row.id!)}
        pageSize={10}
        toolbar={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(EMAIL_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      {selectedId && (
        <DetailDrawer open={!!selectedId} onOpenChange={(o) => !o && select(null)} title="Email" width="lg">
          <EmailDetail id={selectedId} />
        </DetailDrawer>
      )}
      <EmailFormDialog open={creating} onOpenChange={setCreating} />
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete email log?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteId) return
          const res = await fetch(`/api/email-logs/${deleteId}`, { method: 'DELETE' })
          if (!res.ok) { toast.error('Failed'); return }
          toast.success('Deleted')
          setDeleteId(null)
          refetch()
        }}
      />
    </div>
  )
}

function EmailDetail({ id }: { id: string }) {
  const { data, isLoading } = useEntity<Email>('email-logs', id)
  const e = data
  if (isLoading || !e) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />)}</div>
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <StatusBadge label={EMAIL_STATUSES[e.status]?.label ?? e.status} className={EMAIL_STATUSES[e.status]?.color} />
        <span className="text-xs text-muted-foreground">{formatDateTime(e.sentAt)}</span>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Subject</p>
        <p className="mt-0.5 text-base font-semibold text-foreground">{e.subject}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4">
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">From</p><p className="mt-0.5 text-sm text-foreground">{e.from}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">To</p><p className="mt-0.5 text-sm text-foreground">{e.to}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">CC</p><p className="mt-0.5 text-sm text-foreground">{e.cc ?? '—'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Opened</p><p className="mt-0.5 text-sm text-foreground">{e.openedAt ? formatDateTime(e.openedAt) : '—'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer</p><p className="mt-0.5 text-sm text-foreground">{e.customer?.name ?? '—'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Lead</p><p className="mt-0.5 text-sm text-foreground">{e.lead?.name ?? '—'}</p></div>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Body</p>
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground whitespace-pre-wrap">{e.body}</div>
      </div>
    </div>
  )
}

function EmailFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateEntity('email-logs', 'Email logged')

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'list', { pageSize: 100 }],
    queryFn: async () => { const r = await fetch('/api/customers?pageSize=100'); return r.json() },
  })

  const [form, setForm] = useState<Record<string, any>>({
    to: '', from: '', cc: '', subject: '', body: '', status: 'SENT', customerId: '',
  })

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })) }

  async function onSubmit() {
    if (!form.to || !form.from || !form.subject || !form.body) { toast.error('Fill in all required fields'); return }
    await create.mutateAsync({ ...form, customerId: form.customerId || null })
    setForm({ to: '', from: '', cc: '', subject: '', body: '', status: 'SENT', customerId: '' })
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => { if (!o) { setForm({ to: '', from: '', cc: '', subject: '', body: '', status: 'SENT', customerId: '' }) }; onOpenChange(o) }}
      title="Log Email"
      onSubmit={onSubmit}
      loading={create.isPending}
      submitLabel="Log email"
      size="lg"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="To *"><Input type="email" value={form.to} onChange={(e) => set('to', e.target.value)} /></Field>
        <Field label="From *"><Input type="email" value={form.from} onChange={(e) => set('from', e.target.value)} /></Field>
        <Field label="CC"><Input value={form.cc} onChange={(e) => set('cc', e.target.value)} /></Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(EMAIL_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Customer">
        <Select value={form.customerId} onValueChange={(v) => set('customerId', v)}>
          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {customersData?.data?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.company})</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Subject *"><Input value={form.subject} onChange={(e) => set('subject', e.target.value)} /></Field>
      <Field label="Body *"><Textarea rows={6} value={form.body} onChange={(e) => set('body', e.target.value)} /></Field>
    </FormDialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>
}
