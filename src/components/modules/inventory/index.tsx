'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Warehouse, AlertTriangle, Plus as PlusIcon, History, User as UserIcon } from 'lucide-react'
import { useEntityList } from '@/hooks/use-entity'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { DetailDrawer } from '@/components/shared/detail-drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormDialog } from '@/components/shared/form-dialog'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatRelative } from '@/lib/utils'
import { STOCK_MOVEMENT_TYPES } from '@/lib/constants'
import { toast } from 'sonner'

type Inventory = any

export function InventoryModule() {
  const [lowStock, setLowStock] = useState(false)
  const [adjustId, setAdjustId] = useState<string | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const { data, isLoading, error, refetch } = useEntityList<Inventory>('inventory', {
    page: 1, pageSize: 10, lowStock: lowStock ? 'true' : 'all',
  })

  const columns: ColumnDef<Inventory>[] = [
    {
      id: 'product',
      header: 'Product',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.product?.name ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.product?.sku}</p>
        </div>
      ),
    },
    { id: 'category', header: 'Category', cell: ({ row }) => <Badge variant="outline" className="text-xs">{row.original.product?.categoryRef?.name ?? row.original.product?.category ?? '—'}</Badge> },
    {
      id: 'quantity',
      header: 'In stock',
      cell: ({ row }) => {
        const low = row.original.quantity <= row.original.reorderLevel
        return (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${low ? 'text-rose-600' : 'text-foreground'}`}>{row.original.quantity}</span>
            {low && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
          </div>
        )
      },
    },
    {
      id: 'reserved',
      header: 'Reserved',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.reserved}</span>,
    },
    {
      id: 'available',
      header: 'Available',
      cell: ({ row }) => <span className="text-xs font-medium text-foreground">{row.original.quantity - row.original.reserved}</span>,
    },
    {
      id: 'reorderLevel',
      header: 'Reorder at',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.reorderLevel}</span>,
    },
    { id: 'location', header: 'Location', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.location ?? '—'}</span> },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const low = row.original.quantity <= row.original.reorderLevel
        return <Badge variant="outline" className={`text-xs ${low ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{low ? 'Low stock' : 'In stock'}</Badge>
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setHistoryId(row.original.id)} title="Stock history">
            <History className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAdjustId(row.original.id)} title="Adjust stock">
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        description="Monitor stock levels, adjust quantities, and audit every stock movement"
        icon={<Warehouse className="h-5 w-5" />}
        actions={
          <Button variant={lowStock ? 'default' : 'outline'} onClick={() => setLowStock(!lowStock)} className="gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            {lowStock ? 'Showing low stock only' : 'Show low stock only'}
          </Button>
        }
      />
      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        error={error?.message ?? null}
        onRetry={() => refetch()}
        searchPlaceholder="Search by product name, SKU…"
        pageSize={10}
      />
      <AdjustStockDialog id={adjustId} open={!!adjustId} onOpenChange={(o) => !o && setAdjustId(null)} />
      <StockHistoryDrawer id={historyId} open={!!historyId} onOpenChange={(o) => !o && setHistoryId(null)} />
    </div>
  )
}

function AdjustStockDialog({ id, open, onOpenChange }: { id: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [adjustBy, setAdjustBy] = useState<number>(0)
  const [newQty, setNewQty] = useState<number | null>(null)
  const [mode, setMode] = useState<'add' | 'set'>('add')
  const [type, setType] = useState<string>('ADJUST')
  const [reason, setReason] = useState('')

  async function onSubmit() {
    if (!id) return
    const payload: Record<string, unknown> = mode === 'add' ? { adjustBy } : { quantity: newQty }
    payload.type = type
    payload.reason = reason || undefined
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) { toast.error('Failed to adjust stock'); return }
    toast.success('Stock updated')
    setAdjustBy(0); setNewQty(null); setReason(''); setType('ADJUST')
    qc.invalidateQueries({ queryKey: ['inventory'] })
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => { if (!o) { setAdjustBy(0); setNewQty(null); setReason(''); setType('ADJUST') } onOpenChange(o) }}
      title="Adjust Stock"
      description="Add or set the quantity for this inventory item — every change is logged."
      onSubmit={onSubmit}
      submitLabel="Update stock"
      size="sm"
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button type="button" variant={mode === 'add' ? 'default' : 'outline'} size="sm" onClick={() => setMode('add')} className="flex-1">Adjust by amount</Button>
          <Button type="button" variant={mode === 'set' ? 'default' : 'outline'} size="sm" onClick={() => setMode('set')} className="flex-1">Set exact quantity</Button>
        </div>
        {mode === 'add' ? (
          <Field label="Adjustment (positive or negative)">
            <Input type="number" value={adjustBy} onChange={(e) => setAdjustBy(Number(e.target.value))} placeholder="e.g. 10 or -5" />
            <p className="mt-1 text-xs text-muted-foreground">Use positive numbers to add stock, negative to remove.</p>
          </Field>
        ) : (
          <Field label="New quantity">
            <Input type="number" min={0} value={newQty ?? ''} onChange={(e) => setNewQty(Number(e.target.value))} />
          </Field>
        )}
        <Field label="Movement type">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STOCK_MOVEMENT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Reason (optional)">
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Cycle count correction, damaged in transit…" />
        </Field>
      </div>
    </FormDialog>
  )
}

function StockHistoryDrawer({ id, open, onOpenChange }: { id: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'movements', id],
    enabled: !!id && open,
    queryFn: async () => {
      const res = await fetch(`/api/inventory/${id}/movements`)
      if (!res.ok) throw new Error('Failed to load history')
      return res.json() as Promise<{ data: any[] }>
    },
  })

  return (
    <DetailDrawer open={open} onOpenChange={onOpenChange} title="Stock history" icon={<History className="h-4 w-4" />} width="md">
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" />)}</div>
      ) : !data?.data?.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No stock movements recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {data.data.map((m) => (
            <div key={m.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`text-xs ${STOCK_MOVEMENT_TYPES[m.type]?.color ?? ''}`}>{STOCK_MOVEMENT_TYPES[m.type]?.label ?? m.type}</Badge>
                <span className={`text-sm font-semibold ${m.quantityChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {m.quantityChange >= 0 ? '+' : ''}{m.quantityChange}
                </span>
              </div>
              {m.reason && <p className="mt-1.5 text-xs text-foreground">{m.reason}</p>}
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" /> {m.user?.name ?? 'System'}</span>
                <span>{formatRelative(m.createdAt)} · now {m.quantityAfter}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DetailDrawer>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>
}
