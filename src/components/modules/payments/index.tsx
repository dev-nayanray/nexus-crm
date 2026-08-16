'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { CreditCard, Plus, MoreHorizontal, Trash2, ExternalLink } from 'lucide-react'
import { useEntityList, useEntity, useCreateEntity } from '@/hooks/use-entity'
import { useModuleStore } from '@/stores/module-store'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { DetailDrawer } from '@/components/shared/detail-drawer'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ExportButton } from '@/components/shared/export-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PAYMENT_METHODS, PAYMENT_RECORD_STATUSES } from '@/lib/constants'
import { formatCurrency, formatDate, formatRelative } from '@/lib/utils'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'

type Payment = any

export function PaymentsModule() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [creating, setCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { selectedId, select } = useModuleStore()

  const { data, isLoading, error, refetch } = useEntityList<Payment>('payments', {
    page: 1, pageSize: 10, status: statusFilter, method: methodFilter,
  })

  const columns: ColumnDef<Payment>[] = [
    {
      id: 'number',
      header: 'Payment',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.number}</p>
          <p className="text-xs text-muted-foreground">{formatDate(row.original.paidAt ?? row.original.createdAt)}</p>
        </div>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <p className="truncate text-sm text-foreground">{row.original.customer?.name ?? '—'}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.customer?.company ?? ''}</p>
        </div>
      ),
    },
    {
      id: 'order',
      header: 'Order',
      cell: ({ row }) => <span className="text-xs">{row.original.order?.number ?? '—'}</span>,
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => <span className="text-sm font-semibold text-foreground">{formatCurrency(row.original.amount, row.original.currency)}</span>,
    },
    {
      id: 'method',
      header: 'Method',
      cell: ({ row }) => <span className="text-xs capitalize text-muted-foreground">{row.original.method.replace('_', ' ').toLowerCase()}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge
          label={PAYMENT_RECORD_STATUSES[row.original.status]?.label ?? row.original.status}
          className={PAYMENT_RECORD_STATUSES[row.original.status]?.color}
        />
      ),
    },
    {
      id: 'createdAt',
      header: 'Recorded',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.createdAt)}</span>,
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
            <DropdownMenuItem onClick={() => select(row.original.id)}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" /> View details
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
        title="Payments"
        description="Record and track customer payments against orders"
        icon={<CreditCard className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton entity="payments" filters={{ status: statusFilter, method: methodFilter }} />
            <Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Record Payment</Button>
          </div>
        }
      />

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        error={error?.message ?? null}
        onRetry={() => refetch()}
        searchPlaceholder="Search by number, customer, reference…"
        onRowClick={(row) => select(row.id!)}
        pageSize={10}
        toolbar={
          <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(PAYMENT_RECORD_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace('_', ' ').toLowerCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />

      {selectedId && (
        <DetailDrawer open={!!selectedId} onOpenChange={(o) => !o && select(null)} title="Payment details" width="md">
          <PaymentDetail id={selectedId} />
        </DetailDrawer>
      )}

      <PaymentFormDialog open={creating} onOpenChange={setCreating} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete payment?"
        description="This will reverse the payment amount from the linked order and recalculate its payment status."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteId) return
          const res = await fetch(`/api/payments/${deleteId}`, { method: 'DELETE' })
          if (!res.ok) { toast.error('Failed'); return }
          toast.success('Payment deleted')
          setDeleteId(null)
          window.location.reload()
        }}
      />
    </div>
  )
}

function PaymentDetail({ id }: { id: string }) {
  const { data, isLoading } = useEntity<Payment>('payments', id)
  const p = data
  if (isLoading || !p) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />)}</div>
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <StatusBadge label={PAYMENT_RECORD_STATUSES[p.status]?.label ?? p.status} className={PAYMENT_RECORD_STATUSES[p.status]?.color} />
        <span className="text-lg font-semibold text-foreground">{formatCurrency(p.amount, p.currency)}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4">
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Payment #</p><p className="mt-0.5 text-sm text-foreground">{p.number}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Method</p><p className="mt-0.5 text-sm capitalize text-foreground">{p.method.replace('_', ' ').toLowerCase()}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer</p><p className="mt-0.5 text-sm text-foreground">{p.customer?.name}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Order</p><p className="mt-0.5 text-sm text-foreground">{p.order?.number ?? '—'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Paid at</p><p className="mt-0.5 text-sm text-foreground">{formatDate(p.paidAt)}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Reference</p><p className="mt-0.5 text-sm text-foreground">{p.reference ?? '—'}</p></div>
      </div>
      {p.notes && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</p>
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">{p.notes}</p>
        </div>
      )}
    </div>
  )
}

function PaymentFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateEntity('payments', 'Payment recorded')

  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'list', { pageSize: 100, paymentStatus: 'all' }],
    queryFn: async () => { const r = await fetch('/api/orders?pageSize=100'); return r.json() },
  })

  const [form, setForm] = useState<Record<string, any>>({
    orderId: '', amount: 0, method: 'BANK_TRANSFER', status: 'COMPLETED', reference: '', paidAt: new Date().toISOString().split('T')[0], notes: '',
  })
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  function set(k: string, v: any) {
    setForm((f) => ({ ...f, [k]: v }))
    if (k === 'orderId') {
      const o = ordersData?.data?.find((x: any) => x.id === v)
      setSelectedOrder(o)
      if (o) {
        const balance = o.total - o.paidAmount
        setForm((f) => ({ ...f, orderId: v, amount: Math.max(0, balance), currency: o.currency }))
      }
    }
  }

  async function onSubmit() {
    if (!form.orderId) { toast.error('Select an order'); return }
    if (!form.amount || form.amount <= 0) { toast.error('Enter a valid amount'); return }
    await create.mutateAsync({ ...form, amount: Number(form.amount) })
    setForm({ orderId: '', amount: 0, method: 'BANK_TRANSFER', status: 'COMPLETED', reference: '', paidAt: new Date().toISOString().split('T')[0], notes: '' })
    setSelectedOrder(null)
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => { if (!o) { setForm({ orderId: '', amount: 0, method: 'BANK_TRANSFER', status: 'COMPLETED', reference: '', paidAt: new Date().toISOString().split('T')[0], notes: '' }); setSelectedOrder(null) } onOpenChange(o) }}
      title="Record Payment"
      description="Record a payment against an existing order"
      onSubmit={onSubmit}
      loading={create.isPending}
      submitLabel="Record payment"
      size="md"
    >
      <Field label="Order *">
        <Select value={form.orderId} onValueChange={(v) => set('orderId', v)}>
          <SelectTrigger><SelectValue placeholder="Select order…" /></SelectTrigger>
          <SelectContent>
            {ordersData?.data?.map((o: any) => (
              <SelectItem key={o.id} value={o.id}>
                {o.number} · {o.customer?.name} — {formatCurrency(o.total - o.paidAmount, o.currency)} due
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {selectedOrder && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900">
          <div className="flex justify-between"><span>Order total</span><span className="font-medium">{formatCurrency(selectedOrder.total, selectedOrder.currency)}</span></div>
          <div className="flex justify-between"><span>Already paid</span><span>{formatCurrency(selectedOrder.paidAmount, selectedOrder.currency)}</span></div>
          <div className="flex justify-between border-t border-emerald-200 mt-1 pt-1"><span>Balance due</span><span className="font-semibold">{formatCurrency(selectedOrder.total - selectedOrder.paidAmount, selectedOrder.currency)}</span></div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount *"><Input type="number" step="0.01" value={form.amount ?? 0} onChange={(e) => set('amount', e.target.value)} /></Field>
        <Field label="Method">
          <Select value={form.method} onValueChange={(v) => set('method', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace('_', ' ').toLowerCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_RECORD_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Paid date"><Input type="date" value={form.paidAt ?? ''} onChange={(e) => set('paidAt', e.target.value)} /></Field>
      </div>
      <Field label="Reference"><Input value={form.reference ?? ''} onChange={(e) => set('reference', e.target.value)} placeholder="Transaction ID, check #…" /></Field>
      <Field label="Notes"><Textarea rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
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
