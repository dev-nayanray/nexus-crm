'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { ShoppingCart, Plus, MoreHorizontal, Pencil, Trash2, ExternalLink, FileText, UserCog, RefreshCw } from 'lucide-react'
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
import { SavedFiltersButton } from '@/components/shared/saved-filters-button'
import { PdfDownloadButton } from '@/components/shared/pdf-download-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { ORDER_STATUSES, PAYMENT_STATUS } from '@/lib/constants'
import { formatCurrency, formatDate, formatRelative } from '@/lib/utils'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { OrdersKanban } from './kanban'
import { useAuth } from '@/hooks/use-auth'

type Order = any

export function OrdersModule() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [payFilter, setPayFilter] = useState<string>('all')
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
  const bulk = useBulkAction('orders')

  const { data, isLoading, error, refetch } = useEntityList<Order>('orders', {
    page: 1, pageSize: 10, status: statusFilter, paymentStatus: payFilter,
  })

  const columns: ColumnDef<Order>[] = [
    {
      id: 'number',
      header: 'Order',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.number}</p>
          <p className="text-xs text-muted-foreground">{formatDate(row.original.orderDate)}</p>
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
      id: 'total',
      header: 'Total',
      cell: ({ row }) => <span className="text-sm font-semibold text-foreground">{formatCurrency(row.original.total, row.original.currency)}</span>,
    },
    {
      id: 'paid',
      header: 'Paid',
      cell: ({ row }) => (
        <div>
          <p className="text-xs text-foreground">{formatCurrency(row.original.paidAmount, row.original.currency)}</p>
          <p className="text-xs text-muted-foreground">of {formatCurrency(row.original.total, row.original.currency)}</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge
          label={ORDER_STATUSES[row.original.status]?.label ?? row.original.status}
          className={ORDER_STATUSES[row.original.status]?.color}
        />
      ),
    },
    {
      id: 'paymentStatus',
      header: 'Payment',
      cell: ({ row }) => (
        <StatusBadge
          label={PAYMENT_STATUS[row.original.paymentStatus]?.label ?? row.original.paymentStatus}
          className={PAYMENT_STATUS[row.original.paymentStatus]?.color}
        />
      ),
    },
    {
      id: 'createdAt',
      header: 'Created',
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
            <DropdownMenuItem onClick={() => { select(row.original.id); setEditing(true) }}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
        title="Orders"
        description="Track customer orders from confirmation to delivery"
        icon={<ShoppingCart className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle />
            <ExportButton entity="orders" filters={{ status: statusFilter, paymentStatus: payFilter }} />
            <Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Order</Button>
          </div>
        }
      />

      {viewMode === 'kanban' ? (
        <OrdersKanban />
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
            searchPlaceholder="Search by order number, customer…"
            onRowClick={(row) => select(row.id!)}
            pageSize={10}
            enableSelection
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            toolbar={
              <>
                <SavedFiltersButton
                  module="orders"
                  currentFilters={{ status: statusFilter, paymentStatus: payFilter }}
                  onApplyFilter={(f) => {
                    if (f.status) setStatusFilter(f.status)
                    if (f.paymentStatus) setPayFilter(f.paymentStatus)
                  }}
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {Object.entries(ORDER_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={payFilter} onValueChange={setPayFilter}>
                  <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Payment" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All payments</SelectItem>
                    {Object.entries(PAYMENT_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
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
        entityLabel="order"
        onConfirm={async (userId) => {
          const r = await bulk.execute('assign', selectedIds, userId)
          toast.success(`Assigned ${r.count} orders`)
          setSelectedIds([])
        }}
      />

      <BulkStatusDialog
        open={bulkStatus}
        onOpenChange={setBulkStatus}
        count={selectedIds.length}
        entityLabel="order"
        statusLabel="Status"
        statuses={Object.entries(ORDER_STATUSES).map(([value, c]) => ({ value, label: c.label, color: c.color }))}
        onConfirm={async (status) => {
          const r = await bulk.execute('status', selectedIds, status)
          toast.success(`Updated ${r.count} orders`)
          setSelectedIds([])
        }}
      />

      <BulkDeleteDialog
        open={bulkDelete}
        onOpenChange={setBulkDelete}
        count={selectedIds.length}
        entityLabel="order"
        onConfirm={async () => {
          const r = await bulk.execute('delete', selectedIds)
          toast.success(`Deleted ${r.count} orders`)
          setSelectedIds([])
        }}
      />

      {selectedId && (
        <OrderDetailDrawer id={selectedId} open={!!selectedId} onOpenChange={(o) => !o && select(null)} onEdit={() => setEditing(true)} />
      )}

      <OrderFormDialog open={creating || editing} onOpenChange={(o) => { setCreating(false); setEditing(false) }} id={editing ? selectedId : null} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete order?"
        description="This permanently deletes the order and its line items. Related payments will be unlinked."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteId) return
          const res = await fetch(`/api/orders/${deleteId}`, { method: 'DELETE' })
          if (!res.ok) { toast.error('Failed'); return }
          toast.success('Deleted')
          setDeleteId(null)
          window.location.reload()
        }}
      />
    </div>
  )
}

function OrderDetailDrawer({ id, open, onOpenChange, onEdit }: { id: string; open: boolean; onOpenChange: (o: boolean) => void; onEdit: () => void }) {
  const { data, isLoading } = useEntity<Order>('orders', id)
  const qc = useQueryClient()
  const o = data

  async function changeStatus(status: string) {
    const res = await fetch(`/api/orders/${id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    if (!res.ok) { toast.error('Failed'); return }
    toast.success(`Status: ${ORDER_STATUSES[status]?.label ?? status}`)
    qc.invalidateQueries({ queryKey: ['orders'] })
  }

  return (
    <DetailDrawer open={open} onOpenChange={onOpenChange} title={o?.number ?? 'Order'} description={o?.customer ? `${o.customer.name} · ${o.customer.company}` : ''} width="xl">
      {isLoading || !o ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/50" />)}</div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge label={ORDER_STATUSES[o.status]?.label ?? o.status} className={ORDER_STATUSES[o.status]?.color} />
              <StatusBadge label={PAYMENT_STATUS[o.paymentStatus]?.label ?? o.paymentStatus} className={PAYMENT_STATUS[o.paymentStatus]?.color} />
            </div>
            <div className="flex items-center gap-2">
              <PdfDownloadButton
                endpoint={`/api/orders/${o.id}/invoice`}
                filename={`invoice-${o.number}.pdf`}
                label="Invoice PDF"
              />
              <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</Button>
            </div>
          </div>

          {/* Status workflow */}
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Update status</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ORDER_STATUSES).filter(([k]) => k !== o.status).map(([k, v]) => (
                <button key={k} onClick={() => changeStatus(k)} className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/50">
                  Mark as {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4">
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer</p><p className="mt-0.5 text-sm text-foreground">{o.customer?.name}</p><p className="text-xs text-muted-foreground">{o.customer?.company}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Owner</p><p className="mt-0.5 text-sm text-foreground">{o.owner?.name ?? '—'}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Order date</p><p className="mt-0.5 text-sm text-foreground">{formatDate(o.orderDate)}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Quotation</p><p className="mt-0.5 text-sm text-foreground">{o.quotation?.number ?? '—'}</p></div>
            {o.shippedAt && <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Shipped</p><p className="mt-0.5 text-sm text-foreground">{formatDate(o.shippedAt)}</p></div>}
            {o.deliveredAt && <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Delivered</p><p className="mt-0.5 text-sm text-foreground">{formatDate(o.deliveredAt)}</p></div>}
          </div>

          {/* Line items */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Items ({o.items?.length ?? 0})</p>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                  <tr><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Unit price</th><th className="px-3 py-2 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {o.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 text-foreground">{it.description}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{it.qty}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(it.unitPrice, o.currency)}</td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">{formatCurrency(it.total, o.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ml-auto w-full max-w-xs space-y-1.5 rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <Row label="Subtotal" value={formatCurrency(o.subtotal, o.currency)} />
            <Row label="Tax" value={formatCurrency(o.taxAmount, o.currency)} />
            {o.shipping > 0 && <Row label="Shipping" value={formatCurrency(o.shipping, o.currency)} />}
            <div className="border-t border-border pt-2"><Row label="Total" value={formatCurrency(o.total, o.currency)} bold /></div>
            <div className="border-t border-border pt-2"><Row label="Paid" value={formatCurrency(o.paidAmount, o.currency)} /></div>
            <Row label="Balance due" value={formatCurrency(Math.max(0, o.total - o.paidAmount), o.currency)} />
          </div>

          {o.payments && o.payments.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Payments ({o.payments.length})</p>
              <div className="divide-y divide-border rounded-lg border border-border">
                {o.payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div>
                      <p className="font-medium text-foreground">{p.number}</p>
                      <p className="text-muted-foreground">{formatDate(p.paidAt ?? p.createdAt)} · {p.method}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{formatCurrency(p.amount, o.currency)}</span>
                      <StatusBadge label={p.status} className="bg-slate-100 text-slate-700 border-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {o.notes && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</p>
              <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">{o.notes}</p>
            </div>
          )}
        </div>
      )}
    </DetailDrawer>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${bold ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      <span className={`text-xs ${bold ? 'font-semibold text-foreground' : 'text-foreground'}`}>{value}</span>
    </div>
  )
}

function OrderFormDialog({ open, onOpenChange, id }: { open: boolean; onOpenChange: (o: boolean) => void; id: string | null }) {
  const isEdit = !!id
  const { data: existing } = useEntity<Order>('orders', id)
  const create = useCreateEntity('orders', 'Order created')
  const update = useUpdateEntity('orders', id, 'Order updated')

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'list', { pageSize: 100 }],
    queryFn: async () => { const r = await fetch('/api/customers?pageSize=100'); return r.json() },
  })
  const { data: productsData } = useQuery({
    queryKey: ['products', 'list', { pageSize: 100 }],
    queryFn: async () => { const r = await fetch('/api/products?pageSize=100'); return r.json() },
  })

  const [form, setForm] = useState<Record<string, any>>({})
  const [items, setItems] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  if (isEdit && existing && !loaded) {
    setForm({
      customerId: existing.customerId, status: existing.status,
      taxRate: existing.taxRate, discount: existing.discount, shipping: existing.shipping,
      currency: existing.currency, notes: existing.notes ?? '',
      shippingAddress: existing.shippingAddress ?? '', billingAddress: existing.billingAddress ?? '',
    })
    setItems(existing.items.map((it: any) => ({
      productId: it.productId ?? '', description: it.description, qty: it.qty,
      unitPrice: it.unitPrice, discount: it.discount, taxRate: it.taxRate,
    })))
    setLoaded(true)
  }
  if (!isEdit && Object.keys(form).length === 0) {
    setForm({ customerId: '', status: 'PENDING', taxRate: 10, discount: 0, shipping: 0, currency: 'USD', notes: '', shippingAddress: '', billingAddress: '' })
    setItems([{ productId: '', description: '', qty: 1, unitPrice: 0, discount: 0, taxRate: 0 }])
  }

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })) }

  function setItem(idx: number, key: string, value: any) {
    setItems((arr) => arr.map((it, i) => {
      if (i !== idx) return it
      const updated = { ...it, [key]: value }
      if (key === 'productId' && value) {
        const p = productsData?.data?.find((x: any) => x.id === value)
        if (p) { updated.description = p.name; updated.unitPrice = p.price; updated.taxRate = p.taxRate ?? 0 }
      }
      return updated
    }))
  }

  function addItem() { setItems((arr) => [...arr, { productId: '', description: '', qty: 1, unitPrice: 0, discount: 0, taxRate: 0 }]) }
  function removeItem(idx: number) { setItems((arr) => arr.filter((_, i) => i !== idx)) }

  let subtotal = 0
  for (const it of items) subtotal += Number(it.qty) * Number(it.unitPrice)
  const taxAmt = subtotal * (Number(form.taxRate) / 100)
  const total = subtotal + taxAmt + Number(form.shipping)

  async function onSubmit() {
    if (!form.customerId) { toast.error('Select a customer'); return }
    if (items.length === 0 || items.some((it) => !it.description)) { toast.error('All items need a description'); return }
    const payload = { ...form, items: items.map((it) => ({ ...it, qty: Number(it.qty), unitPrice: Number(it.unitPrice), discount: Number(it.discount), taxRate: Number(it.taxRate) })) }
    if (isEdit) await update.mutateAsync(payload)
    else await create.mutateAsync(payload)
    setLoaded(false); setForm({}); setItems([])
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => { if (!o) { setLoaded(false); setForm({}); setItems([]) } onOpenChange(o) }}
      title={isEdit ? 'Edit Order' : 'New Order'}
      description={isEdit ? 'Update order details' : 'Create a new order with line items'}
      onSubmit={onSubmit}
      loading={create.isPending || update.isPending}
      submitLabel={isEdit ? 'Save changes' : 'Create order'}
      size="xl"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Customer *">
          <Select value={form.customerId} onValueChange={(v) => set('customerId', v)}>
            <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
            <SelectContent>
              {customersData?.data?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.company})</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ORDER_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tax rate (%)"><Input type="number" value={form.taxRate ?? 0} onChange={(e) => set('taxRate', e.target.value)} /></Field>
        <Field label="Shipping"><Input type="number" value={form.shipping ?? 0} onChange={(e) => set('shipping', e.target.value)} /></Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">Line items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-xs"><Plus className="mr-1 h-3 w-3" /> Add item</Button>
        </div>
        <div className="space-y-2 rounded-lg border border-border p-3">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <Select value={it.productId} onValueChange={(v) => setItem(idx, 'productId', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Product…" /></SelectTrigger>
                  <SelectContent>
                    {productsData?.data?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input className="col-span-3 h-8 text-xs" placeholder="Description" value={it.description} onChange={(e) => setItem(idx, 'description', e.target.value)} />
              <Input className="col-span-1 h-8 text-xs" type="number" placeholder="Qty" value={it.qty} onChange={(e) => setItem(idx, 'qty', e.target.value)} />
              <Input className="col-span-2 h-8 text-xs" type="number" placeholder="Price" value={it.unitPrice} onChange={(e) => setItem(idx, 'unitPrice', e.target.value)} />
              <Input className="col-span-2 h-8 text-xs" type="number" placeholder="Tax%" value={it.taxRate} onChange={(e) => setItem(idx, 'taxRate', e.target.value)} />
              <Button type="button" variant="ghost" size="icon" className="col-span-1 h-8 w-8 text-rose-600" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      </div>

      <div className="ml-auto w-full max-w-xs space-y-1 rounded-lg bg-muted/30 p-3 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">{formatCurrency(subtotal, form.currency)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Tax ({form.taxRate}%)</span><span className="text-foreground">{formatCurrency(taxAmt, form.currency)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="text-foreground">{formatCurrency(Number(form.shipping), form.currency)}</span></div>
        <div className="flex justify-between border-t border-border pt-1 font-semibold"><span className="text-foreground">Total</span><span className="text-foreground">{formatCurrency(total, form.currency)}</span></div>
      </div>

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
