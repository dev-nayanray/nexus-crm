'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Building2, Plus, MoreHorizontal, Pencil, Trash2, Package, Star } from 'lucide-react'
import { useEntityList, useCreateEntity, useUpdateEntity } from '@/hooks/use-entity'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { WAREHOUSE_STATUSES } from '@/lib/constants'
import { toast } from 'sonner'

type Warehouse = any

export function WarehousesModule() {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null)

  const { data, isLoading, error, refetch } = useEntityList<Warehouse>('warehouses', {
    page: 1, pageSize: 50, sort: 'name', order: 'asc',
  })

  const warehouses: Warehouse[] = data?.data ?? []

  const columns: ColumnDef<Warehouse>[] = [
    {
      id: 'name',
      header: 'Warehouse',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-emerald-600" />
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {row.original.name}
              {row.original.isDefault && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
            </p>
            <p className="text-xs text-muted-foreground">{row.original.code}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'location',
      header: 'Location',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {[row.original.address, row.original.city].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    {
      id: 'stock',
      header: 'Products stocked',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Package className="h-3 w-3" /> {row.original._count?.inventory ?? 0}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge label={WAREHOUSE_STATUSES[row.original.status]?.label ?? row.original.status} className={WAREHOUSE_STATUSES[row.original.status]?.color} />
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
            <DropdownMenuItem onClick={() => setEditing(row.original)}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteTarget(row.original)}>
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
        title="Warehouses"
        description="Manage the physical or virtual locations you stock products in"
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add Warehouse</Button>
        }
      />
      <DataTable
        data={warehouses}
        columns={columns}
        isLoading={isLoading}
        error={error?.message ?? null}
        onRetry={() => refetch()}
        searchPlaceholder="Search warehouses…"
        pageSize={50}
        emptyTitle="No warehouses yet"
        emptyDescription="Create your first warehouse — stock can then be received, adjusted, and transferred per location."
        emptyAction={<Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add Warehouse</Button>}
      />

      <WarehouseFormDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null) } }}
        warehouse={editing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This cannot be undone. Warehouses that still hold stock, or the default warehouse, cannot be deleted — transfer stock out or change the default first."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteTarget) return
          const res = await fetch(`/api/warehouses/${deleteTarget.id}`, { method: 'DELETE' })
          if (!res.ok) {
            const e = await res.json().catch(() => ({ error: 'Failed to delete' }))
            toast.error(e.error ?? 'Failed to delete')
            return
          }
          toast.success('Warehouse deleted')
          setDeleteTarget(null)
          refetch()
        }}
      />
    </div>
  )
}

function WarehouseFormDialog({
  open, onOpenChange, warehouse,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  warehouse: Warehouse | null
}) {
  const isEdit = !!warehouse
  const create = useCreateEntity('warehouses', 'Warehouse created')
  const update = useUpdateEntity('warehouses', warehouse?.id ?? null, 'Warehouse updated')

  const initial = warehouse
    ? { name: warehouse.name, code: warehouse.code, address: warehouse.address ?? '', city: warehouse.city ?? '', isDefault: !!warehouse.isDefault, status: warehouse.status }
    : { name: '', code: '', address: '', city: '', isDefault: false, status: 'ACTIVE' }

  const [form, setForm] = useState<Record<string, any>>(initial)
  const [key, setKey] = useState(warehouse?.id ?? 'new')

  if (key !== (warehouse?.id ?? 'new')) {
    setKey(warehouse?.id ?? 'new')
    setForm(initial)
  }

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })) }

  async function onSubmit() {
    const payload = { ...form }
    if (isEdit) await update.mutateAsync(payload)
    else await create.mutateAsync(payload)
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Warehouse' : 'Add Warehouse'}
      onSubmit={onSubmit}
      loading={create.isPending || update.isPending}
      submitLabel={isEdit ? 'Save changes' : 'Create warehouse'}
      size="md"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name *"><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} required /></Field>
          <Field label="Code *"><Input value={form.code ?? ''} onChange={(e) => set('code', e.target.value)} placeholder="e.g. DHK-01" required /></Field>
        </div>
        <Field label="Address"><Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="City"><Input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(WAREHOUSE_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <Label className="text-xs font-medium text-foreground">Default warehouse</Label>
            <p className="text-xs text-muted-foreground">New stock and orders use this warehouse unless another is picked.</p>
          </div>
          <Switch checked={!!form.isDefault} onCheckedChange={(v) => set('isDefault', v)} />
        </div>
      </div>
    </FormDialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>
}
