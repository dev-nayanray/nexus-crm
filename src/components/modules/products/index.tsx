'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Package, Plus, MoreHorizontal, Pencil, Trash2, ExternalLink, RefreshCw, FolderTree } from 'lucide-react'
import { useEntityList, useEntity, useCreateEntity, useUpdateEntity } from '@/hooks/use-entity'
import { useModuleStore } from '@/stores/module-store'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { DetailDrawer } from '@/components/shared/detail-drawer'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { BulkActionBar, BulkStatusDialog, BulkDeleteDialog, useBulkAction } from '@/components/shared/bulk-actions'
import { ExportButton } from '@/components/shared/export-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { PRODUCT_STATUSES } from '@/lib/constants'
import { formatCurrency, formatRelative } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

type Product = any

export function ProductsModule() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { selectedId, select, set: setModule } = useModuleStore()
  const { user } = useAuth()
  const canManage = user?.role === 'ADMIN'

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState(false)
  const [bulkDelete, setBulkDelete] = useState(false)
  const bulk = useBulkAction('products')

  const { data, isLoading, error, refetch } = useEntityList<Product>('products', {
    page: 1, pageSize: 10, status: statusFilter, categoryId: categoryFilter,
  })
  const { data: categoriesData } = useEntityList<any>('categories', { flat: 'true' as any, pageSize: 100 })
  const categories = categoriesData?.data ?? []

  const columns: ColumnDef<Product>[] = [
    {
      id: 'name',
      header: 'Product',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.sku}</p>
        </div>
      ),
    },
    { id: 'category', header: 'Category', cell: ({ row }) => <Badge variant="outline" className="text-xs">{row.original.categoryRef?.name ?? row.original.category ?? '—'}</Badge> },
    { id: 'price', header: 'Price', cell: ({ row }) => <span className="text-sm font-medium text-foreground">{formatCurrency(row.original.price)}</span> },
    { id: 'cost', header: 'Cost', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatCurrency(row.original.cost)}</span> },
    {
      id: 'margin',
      header: 'Margin',
      cell: ({ row }) => {
        const m = row.original.price > 0 ? Math.round(((row.original.price - row.original.cost) / row.original.price) * 100) : 0
        return <span className={`text-xs font-medium ${m > 50 ? 'text-emerald-600' : m > 25 ? 'text-amber-600' : 'text-rose-600'}`}>{m}%</span>
      },
    },
    {
      id: 'stock',
      header: 'Stock',
      cell: ({ row }) => {
        const inv = row.original.inventory
        if (!inv) return <Badge variant="outline" className="text-xs text-slate-500">No stock</Badge>
        const low = inv.quantity <= inv.reorderLevel
        return <Badge variant="outline" className={`text-xs ${low ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{inv.quantity} {row.original.unit}</Badge>
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge label={PRODUCT_STATUSES[row.original.status]?.label ?? row.original.status} className={PRODUCT_STATUSES[row.original.status]?.color} />
      ),
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
        title="Products"
        description="Manage your product catalog, pricing, and stock levels"
        icon={<Package className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setModule('categories')}>
              <FolderTree className="h-3.5 w-3.5" /> Manage categories
            </Button>
            <ExportButton entity="products" filters={{ status: statusFilter, category: categoryFilter }} />
            <Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add Product</Button>
          </div>
        }
      />
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={data?.total ?? 0}
        onSelectAll={() => setSelectedIds(data?.data?.map((c: any) => c.id) ?? [])}
        onClear={() => setSelectedIds([])}
        actions={[
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
        searchPlaceholder="Search products by name, SKU…"
        onRowClick={(row) => select(row.id!)}
        pageSize={10}
        enableSelection
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        toolbar={
          <>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(PRODUCT_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />
      {selectedId && (
        <DetailDrawer open={!!selectedId} onOpenChange={(o) => !o && select(null)} title="Product details" width="md">
          <ProductDetail id={selectedId} onEdit={() => setEditing(true)} />
        </DetailDrawer>
      )}
      <ProductFormDialog open={creating || editing} onOpenChange={(o) => { setCreating(false); setEditing(false) }} id={editing ? selectedId : null} />
      <BulkStatusDialog
        open={bulkStatus}
        onOpenChange={setBulkStatus}
        count={selectedIds.length}
        entityLabel="product"
        statusLabel="Status"
        statuses={Object.entries(PRODUCT_STATUSES).map(([value, c]) => ({ value, label: c.label, color: c.color }))}
        onConfirm={async (status) => {
          const r = await bulk.execute('status', selectedIds, status)
          toast.success(`Updated ${r.count} products`)
          setSelectedIds([])
        }}
      />
      <BulkDeleteDialog
        open={bulkDelete}
        onOpenChange={setBulkDelete}
        count={selectedIds.length}
        entityLabel="product"
        onConfirm={async () => {
          const r = await bulk.execute('delete', selectedIds)
          toast.success(`Deleted ${r.count} products`)
          setSelectedIds([])
        }}
      />
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete product?"
        description="This will also delete the inventory record and unlink from quotations and orders."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteId) return
          const res = await fetch(`/api/products/${deleteId}`, { method: 'DELETE' })
          if (!res.ok) { toast.error('Failed'); return }
          toast.success('Deleted')
          setDeleteId(null)
          window.location.reload()
        }}
      />
    </div>
  )
}

function ProductDetail({ id, onEdit }: { id: string; onEdit: () => void }) {
  const { data, isLoading } = useEntity<Product>('products', id)
  const p = data
  if (isLoading || !p) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />)}</div>
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <StatusBadge label={PRODUCT_STATUSES[p.status]?.label ?? p.status} className={PRODUCT_STATUSES[p.status]?.color} />
        <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</Button>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Name</p>
        <p className="mt-0.5 text-base font-semibold text-foreground">{p.name}</p>
        <p className="text-xs text-muted-foreground">{p.sku}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4">
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Price</p><p className="mt-0.5 text-lg font-semibold text-foreground">{formatCurrency(p.price)}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cost</p><p className="mt-0.5 text-sm text-foreground">{formatCurrency(p.cost)}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</p><p className="mt-0.5 text-sm text-foreground">{p.categoryRef?.name ?? p.category ?? '—'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unit</p><p className="mt-0.5 text-sm text-foreground">{p.unit}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tax rate</p><p className="mt-0.5 text-sm text-foreground">{p.taxRate}%</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Stock</p><p className="mt-0.5 text-sm text-foreground">{p.inventory ? `${p.inventory.quantity} ${p.unit}` : 'No stock'}</p></div>
      </div>
      {p.description && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</p>
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">{p.description}</p>
        </div>
      )}
    </div>
  )
}

function ProductFormDialog({ open, onOpenChange, id }: { open: boolean; onOpenChange: (o: boolean) => void; id: string | null }) {
  const isEdit = !!id
  const { data: existing } = useEntity<Product>('products', id)
  const { data: categoriesData } = useEntityList<any>('categories', { flat: 'true' as any, pageSize: 100 })
  const categories = categoriesData?.data ?? []
  const create = useCreateEntity('products', 'Product created')
  const update = useUpdateEntity('products', id, 'Product updated')

  const [form, setForm] = useState<Record<string, any>>({})
  const [loaded, setLoaded] = useState(false)

  if (isEdit && existing && !loaded) {
    setForm({
      name: existing.name, sku: existing.sku, description: existing.description ?? '',
      categoryId: existing.categoryId ?? existing.categoryRef?.id ?? 'none', unit: existing.unit,
      price: existing.price, cost: existing.cost, taxRate: existing.taxRate,
      status: existing.status, initialStock: '',
    })
    setLoaded(true)
  }
  if (!isEdit && Object.keys(form).length === 0) {
    setForm({ name: '', sku: '', description: '', categoryId: 'none', unit: 'PCS', price: 0, cost: 0, taxRate: 0, status: 'ACTIVE', initialStock: '' })
  }

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })) }

  async function onSubmit() {
    const payload = {
      ...form,
      price: Number(form.price), cost: Number(form.cost), taxRate: Number(form.taxRate),
      initialStock: form.initialStock ? Number(form.initialStock) : null,
      categoryId: form.categoryId === 'none' ? null : form.categoryId,
    }
    if (isEdit) await update.mutateAsync(payload)
    else await create.mutateAsync(payload)
    setLoaded(false); setForm({})
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => { if (!o) { setLoaded(false); setForm({}) } onOpenChange(o) }}
      title={isEdit ? 'Edit Product' : 'Add Product'}
      onSubmit={onSubmit}
      loading={create.isPending || update.isPending}
      submitLabel={isEdit ? 'Save changes' : 'Create product'}
      size="lg"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name *"><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} required /></Field>
        <Field label="SKU *"><Input value={form.sku ?? ''} onChange={(e) => set('sku', e.target.value)} required /></Field>
        <Field label="Category">
          <Select value={form.categoryId ?? 'none'} onValueChange={(v) => set('categoryId', v)}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Uncategorized —</SelectItem>
              {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Unit">
          <Select value={form.unit} onValueChange={(v) => set('unit', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['PCS', 'KG', 'LITER', 'BOX', 'SERVICE'].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Price"><Input type="number" step="0.01" value={form.price ?? 0} onChange={(e) => set('price', e.target.value)} /></Field>
        <Field label="Cost"><Input type="number" step="0.01" value={form.cost ?? 0} onChange={(e) => set('cost', e.target.value)} /></Field>
        <Field label="Tax rate (%)"><Input type="number" value={form.taxRate ?? 0} onChange={(e) => set('taxRate', e.target.value)} /></Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRODUCT_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {!isEdit && (
          <Field label="Initial stock (optional)"><Input type="number" value={form.initialStock ?? ''} onChange={(e) => set('initialStock', e.target.value)} placeholder="0" /></Field>
        )}
      </div>
      <Field label="Description"><Textarea rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
    </FormDialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>
}
