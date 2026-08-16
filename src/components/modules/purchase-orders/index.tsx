'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Truck, Plus, MoreHorizontal, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { useEntityList, useEntity, useCreateEntity, useUpdateEntity } from '@/hooks/use-entity'
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
import { PO_STATUSES } from '@/lib/constants'
import { formatCurrency, formatDate, formatRelative } from '@/lib/utils'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type PurchaseOrder = any

export function PurchaseOrdersModule() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { selectedId, select } = useModuleStore()

  const { data, isLoading, error, refetch } = useEntityList<PurchaseOrder>('purchase-orders', {
    page: 1, pageSize: 10, status: statusFilter,
  })

  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      id: 'number',
      header: 'PO #',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.number}</p>
          <p className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</p>
        </div>
      ),
    },
    {
      id: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => <span className="text-sm text-foreground">{row.original.supplier}</span>,
    },
    { id: 'items', header: 'Items', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original._count?.items ?? 0}</span> },
    { id: 'total', header: 'Total', cell: ({ row }) => <span className="text-sm font-semibold text-foreground">{formatCurrency(row.original.total)}</span> },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge label={PO_STATUSES[row.original.status]?.label ?? row.original.status} className={PO_STATUSES[row.original.status]?.color} />
      ),
    },
    { id: 'expectedDate', header: 'Expected', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.expectedDate)}</span> },
    { id: 'createdAt', header: 'Created', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.createdAt)}</span> },
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
            <DropdownMenuItem onClick={() => { select(row.original.id); setEditing(true) }}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteId(row.original.id)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase Orders"
        description="Order stock from suppliers and track procurement"
        icon={<Truck className="h-5 w-5" />}
        actions={<Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Purchase Order</Button>}
      />
      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        error={error?.message ?? null}
        onRetry={() => refetch()}
        searchPlaceholder="Search by PO number, supplier…"
        onRowClick={(row) => select(row.id!)}
        pageSize={10}
        toolbar={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(PO_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      {selectedId && (
        <DetailDrawer open={!!selectedId} onOpenChange={(o) => !o && select(null)} title="Purchase Order" width="lg">
          <PODetail id={selectedId} onEdit={() => setEditing(true)} />
        </DetailDrawer>
      )}
      <POFormDialog open={creating || editing} onOpenChange={(o) => { setCreating(false); setEditing(false) }} id={editing ? selectedId : null} />
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete purchase order?"
        description="This permanently deletes the PO and its line items."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteId) return
          const res = await fetch(`/api/purchase-orders/${deleteId}`, { method: 'DELETE' })
          if (!res.ok) { toast.error('Failed'); return }
          toast.success('Deleted')
          setDeleteId(null)
          window.location.reload()
        }}
      />
    </div>
  )
}

function PODetail({ id, onEdit }: { id: string; onEdit: () => void }) {
  const { data, isLoading } = useEntity<PurchaseOrder>('purchase-orders', id)
  const qc = useQueryClient()
  const p = data
  async function changeStatus(status: string) {
    const res = await fetch(`/api/purchase-orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    if (!res.ok) { toast.error('Failed'); return }
    toast.success(`Status: ${PO_STATUSES[status]?.label ?? status}`)
    qc.invalidateQueries({ queryKey: ['purchase-orders'] })
  }
  if (isLoading || !p) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />)}</div>
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <StatusBadge label={PO_STATUSES[p.status]?.label ?? p.status} className={PO_STATUSES[p.status]?.color} />
        <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</Button>
      </div>
      {p.status !== 'RECEIVED' && p.status !== 'CANCELLED' && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(PO_STATUSES).filter(([k]) => k !== p.status).map(([k, v]) => (
            <button key={k} onClick={() => changeStatus(k)} className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/50">
              Mark as {v.label}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4">
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">PO #</p><p className="mt-0.5 text-sm text-foreground">{p.number}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Supplier</p><p className="mt-0.5 text-sm text-foreground">{p.supplier}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</p><p className="mt-0.5 text-sm text-foreground">{p.supplierEmail ?? '—'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expected</p><p className="mt-0.5 text-sm text-foreground">{formatDate(p.expectedDate)}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Received</p><p className="mt-0.5 text-sm text-foreground">{formatDate(p.receivedAt)}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Created</p><p className="mt-0.5 text-sm text-foreground">{formatDate(p.createdAt)}</p></div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Items</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="border-b border-border bg-muted/30 text-muted-foreground"><tr><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-border">
              {p.items?.map((it: any) => (
                <tr key={it.id}>
                  <td className="px-3 py-2 text-foreground">{it.description}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{it.qty}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(it.unitPrice)}</td>
                  <td className="px-3 py-2 text-right font-medium text-foreground">{formatCurrency(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="ml-auto w-full max-w-xs rounded-lg bg-muted/30 p-3 text-sm">
        <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(p.total)}</span></div>
      </div>
      {p.notes && (
        <div><p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</p><p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">{p.notes}</p></div>
      )}
    </div>
  )
}

function POFormDialog({ open, onOpenChange, id }: { open: boolean; onOpenChange: (o: boolean) => void; id: string | null }) {
  const isEdit = !!id
  const { data: existing } = useEntity<PurchaseOrder>('purchase-orders', id)
  const create = useCreateEntity('purchase-orders', 'Purchase order created')
  const update = useUpdateEntity('purchase-orders', id, 'Purchase order updated')

  const { data: productsData } = useQuery({
    queryKey: ['products', 'list', { pageSize: 100 }],
    queryFn: async () => { const r = await fetch('/api/products?pageSize=100'); return r.json() },
  })

  const [form, setForm] = useState<Record<string, any>>({})
  const [items, setItems] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  if (isEdit && existing && !loaded) {
    setForm({
      supplier: existing.supplier, supplierEmail: existing.supplierEmail ?? '', supplierPhone: existing.supplierPhone ?? '',
      status: existing.status, expectedDate: existing.expectedDate ? new Date(existing.expectedDate).toISOString().split('T')[0] : '',
      notes: existing.notes ?? '',
    })
    setItems(existing.items.map((it: any) => ({ productId: it.productId ?? '', description: it.description, qty: it.qty, unitPrice: it.unitPrice })))
    setLoaded(true)
  }
  if (!isEdit && Object.keys(form).length === 0) {
    setForm({ supplier: '', supplierEmail: '', supplierPhone: '', status: 'DRAFT', expectedDate: '', notes: '' })
    setItems([{ productId: '', description: '', qty: 1, unitPrice: 0 }])
  }

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })) }

  function setItem(idx: number, key: string, value: any) {
    setItems((arr) => arr.map((it, i) => {
      if (i !== idx) return it
      const updated = { ...it, [key]: value }
      if (key === 'productId' && value) {
        const p = productsData?.data?.find((x: any) => x.id === value)
        if (p) { updated.description = p.name; updated.unitPrice = p.cost }
      }
      return updated
    }))
  }
  function addItem() { setItems((arr) => [...arr, { productId: '', description: '', qty: 1, unitPrice: 0 }]) }
  function removeItem(idx: number) { setItems((arr) => arr.filter((_, i) => i !== idx)) }

  let subtotal = 0
  for (const it of items) subtotal += Number(it.qty) * Number(it.unitPrice)

  async function onSubmit() {
    if (!form.supplier) { toast.error('Enter supplier name'); return }
    if (items.length === 0 || items.some((it) => !it.description)) { toast.error('All items need a description'); return }
    const payload = { ...form, items: items.map((it) => ({ ...it, qty: Number(it.qty), unitPrice: Number(it.unitPrice) })) }
    if (isEdit) await update.mutateAsync(payload)
    else await create.mutateAsync(payload)
    setLoaded(false); setForm({}); setItems([])
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => { if (!o) { setLoaded(false); setForm({}); setItems([]) } onOpenChange(o) }}
      title={isEdit ? 'Edit Purchase Order' : 'New Purchase Order'}
      onSubmit={onSubmit}
      loading={create.isPending || update.isPending}
      submitLabel={isEdit ? 'Save' : 'Create'}
      size="xl"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Supplier *"><Input value={form.supplier ?? ''} onChange={(e) => set('supplier', e.target.value)} /></Field>
        <Field label="Supplier email"><Input type="email" value={form.supplierEmail ?? ''} onChange={(e) => set('supplierEmail', e.target.value)} /></Field>
        <Field label="Supplier phone"><Input value={form.supplierPhone ?? ''} onChange={(e) => set('supplierPhone', e.target.value)} /></Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PO_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Expected date"><Input type="date" value={form.expectedDate ?? ''} onChange={(e) => set('expectedDate', e.target.value)} /></Field>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">Line items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-xs"><Plus className="mr-1 h-3 w-3" /> Add item</Button>
        </div>
        <div className="space-y-2 rounded-lg border border-border p-3">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <div className="col-span-4">
                <Select value={it.productId} onValueChange={(v) => setItem(idx, 'productId', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Product…" /></SelectTrigger>
                  <SelectContent>
                    {productsData?.data?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input className="col-span-4 h-8 text-xs" placeholder="Description" value={it.description} onChange={(e) => setItem(idx, 'description', e.target.value)} />
              <Input className="col-span-1 h-8 text-xs" type="number" placeholder="Qty" value={it.qty} onChange={(e) => setItem(idx, 'qty', e.target.value)} />
              <Input className="col-span-2 h-8 text-xs" type="number" placeholder="Price" value={it.unitPrice} onChange={(e) => setItem(idx, 'unitPrice', e.target.value)} />
              <Button type="button" variant="ghost" size="icon" className="col-span-1 h-8 w-8 text-rose-600" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      </div>
      <div className="ml-auto w-full max-w-xs rounded-lg bg-muted/30 p-3 text-sm">
        <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(subtotal)}</span></div>
      </div>
      <Field label="Notes"><Textarea rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
    </FormDialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>
}
