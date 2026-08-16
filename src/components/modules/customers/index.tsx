'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Users, Plus, Building2, Mail, Phone, MoreHorizontal, Pencil, Trash2, ExternalLink, UserCog, RefreshCw } from 'lucide-react'
import { useEntityList, useEntity, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/use-entity'
import { useModuleStore } from '@/stores/module-store'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { DetailDrawer, DrawerInfoGrid, DrawerInfoItem } from '@/components/shared/detail-drawer'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { BulkActionBar, BulkAssignDialog, BulkStatusDialog, BulkDeleteDialog, useBulkAction } from '@/components/shared/bulk-actions'
import { ExportButton } from '@/components/shared/export-button'
import { CustomerTimeline } from '@/components/shared/customer-timeline'
import { SavedFiltersButton } from '@/components/shared/saved-filters-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CUSTOMER_STATUSES, CUSTOMER_TYPES } from '@/lib/constants'
import { formatCurrency, formatDate, formatRelative, initials } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

type Customer = any

export function CustomersModule() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { selectedId, select } = useModuleStore()
  const { user } = useAuth()
  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES_MANAGER'

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkAssign, setBulkAssign] = useState(false)
  const [bulkStatus, setBulkStatus] = useState(false)
  const [bulkDelete, setBulkDelete] = useState(false)
  const bulk = useBulkAction('customers')

  const { data, isLoading, error, refetch } = useEntityList<Customer>('customers', {
    page, pageSize: 10, status: statusFilter, type: typeFilter,
  })

  const columns: ColumnDef<Customer>[] = [
    {
      id: 'name',
      header: 'Customer',
      cell: ({ row }) => {
        const c = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-emerald-50 text-xs font-medium text-emerald-700">
                {initials(c.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
              <p className="truncate text-xs text-muted-foreground">{c.company}</p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'email',
      header: 'Contact',
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="truncate text-xs text-foreground">{row.original.email}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.phone ?? '—'}</p>
        </div>
      ),
    },
    {
      id: 'industry',
      header: 'Industry',
      cell: ({ row }) => <span className="text-xs">{row.original.industry ?? '—'}</span>,
    },
    {
      id: 'city',
      header: 'Location',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {[row.original.city, row.original.country].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    {
      id: 'orders',
      header: 'Orders',
      cell: ({ row }) => <span className="text-xs font-medium">{row.original._count?.orders ?? 0}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge
          label={CUSTOMER_STATUSES[row.original.status]?.label ?? row.original.status}
          className={CUSTOMER_STATUSES[row.original.status]?.color}
        />
      ),
    },
    {
      id: 'createdAt',
      header: 'Added',
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
        title="Customers"
        description="Manage your customer accounts and relationships"
        icon={<Users className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton entity="customers" filters={{ status: statusFilter, type: typeFilter }} />
            <Button onClick={() => setCreating(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        }
      />

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
        searchPlaceholder="Search by name, company, email…"
        onRowClick={(row) => select(row.id!)}
        pageSize={10}
        enableSelection
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        toolbar={
          <>
            <SavedFiltersButton
              module="customers"
              currentFilters={{ status: statusFilter, type: typeFilter }}
              onApplyFilter={(f) => {
                if (f.status) setStatusFilter(f.status)
                if (f.type) setTypeFilter(f.type)
              }}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="BUSINESS">Business</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {(selectedId || creating) && (
        <CustomerDetailDrawer
          id={selectedId}
          open={!!selectedId}
          onOpenChange={(o) => !o && select(null)}
          onEdit={() => setEditing(true)}
        />
      )}

      <CustomerFormDialog
        open={creating || editing}
        onOpenChange={(o) => { setCreating(false); setEditing(false) }}
        id={editing ? selectedId : null}
      />

      <BulkAssignDialog
        open={bulkAssign}
        onOpenChange={setBulkAssign}
        count={selectedIds.length}
        entityLabel="customer"
        onConfirm={async (userId) => {
          const r = await bulk.execute('assign', selectedIds, userId)
          toast.success(`Assigned ${r.count} customers`)
          setSelectedIds([])
        }}
      />

      <BulkStatusDialog
        open={bulkStatus}
        onOpenChange={setBulkStatus}
        count={selectedIds.length}
        entityLabel="customer"
        statusLabel="Status"
        statuses={Object.entries(CUSTOMER_STATUSES).map(([value, c]) => ({ value, label: c.label, color: c.color }))}
        onConfirm={async (status) => {
          const r = await bulk.execute('status', selectedIds, status)
          toast.success(`Updated ${r.count} customers`)
          setSelectedIds([])
        }}
      />

      <BulkDeleteDialog
        open={bulkDelete}
        onOpenChange={setBulkDelete}
        count={selectedIds.length}
        entityLabel="customer"
        onConfirm={async () => {
          const r = await bulk.execute('delete', selectedIds)
          toast.success(`Deleted ${r.count} customers`)
          setSelectedIds([])
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete customer?"
        description="This will permanently delete the customer and unlink related records. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteId) return
          try {
            const res = await fetch(`/api/customers/${deleteId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed')
            select(null)
            setDeleteId(null)
            // Force refetch
            window.location.reload()
          } catch (e) {
            alert('Failed to delete customer')
          }
        }}
      />
    </div>
  )
}

function CustomerDetailDrawer({ id, open, onOpenChange, onEdit }: {
  id: string | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onEdit: () => void
}) {
  const { data, isLoading } = useEntity<Customer>('customers', id)
  const c = data

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={c?.name ?? 'Customer'}
      description={c ? `${c.company} · ${c.email}` : 'Loading…'}
      width="xl"
      icon={<Users className="h-5 w-5" />}
      badge={c ? <StatusBadge label={CUSTOMER_STATUSES[c.status]?.label ?? c.status} className={CUSTOMER_STATUSES[c.status]?.color} /> : undefined}
      actions={
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      }
    >
      {isLoading || !c ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <DrawerInfoGrid>
            <DrawerInfoItem label="Contact" value={c.name} />
            <DrawerInfoItem label="Company" value={c.company} />
            <DrawerInfoItem label="Email" value={c.email} icon={<Mail className="h-3 w-3" />} />
            <DrawerInfoItem label="Phone" value={c.phone} icon={<Phone className="h-3 w-3" />} />
            <DrawerInfoItem label="Industry" value={c.industry} icon={<Building2 className="h-3 w-3" />} />
            <DrawerInfoItem label="Type" value={CUSTOMER_TYPES.includes(c.type) ? c.type : 'BUSINESS'} />
            <DrawerInfoItem label="Annual Revenue" value={c.annualRevenue ? formatCurrency(c.annualRevenue) : null} />
            <DrawerInfoItem label="Employees" value={c.employees?.toString()} />
            <DrawerInfoItem label="Location" value={[c.city, c.state, c.country].filter(Boolean).join(', ') || null} />
            <DrawerInfoItem label="Owner" value={c.owner?.name} />
            <DrawerInfoItem label="Customer since" value={formatDate(c.createdAt)} />
          </DrawerInfoGrid>

          <Tabs defaultValue="timeline">
            <TabsList className="grid w-full grid-cols-5 h-9">
              <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs">Orders ({c._count?.orders ?? 0})</TabsTrigger>
              <TabsTrigger value="quotations" className="text-xs">Quotes ({c._count?.quotations ?? 0})</TabsTrigger>
              <TabsTrigger value="leads" className="text-xs">Leads ({c._count?.leads ?? 0})</TabsTrigger>
              <TabsTrigger value="payments" className="text-xs">Payments ({c._count?.payments ?? 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="mt-4">
              <CustomerTimeline customerId={c.id} />
            </TabsContent>
            <TabsContent value="orders" className="mt-4">
              <RelatedList
                items={c.orders?.map((o: any) => ({
                  id: o.id, primary: o.number, secondary: formatDate(o.createdAt),
                  value: formatCurrency(o.total, o.currency), status: o.status,
                })) ?? []}
                emptyText="No orders yet"
              />
            </TabsContent>
            <TabsContent value="quotations" className="mt-4">
              <RelatedList
                items={c.quotations?.map((q: any) => ({
                  id: q.id, primary: q.number, secondary: formatDate(q.createdAt),
                  value: formatCurrency(q.total, q.currency), status: q.status,
                })) ?? []}
                emptyText="No quotations yet"
              />
            </TabsContent>
            <TabsContent value="leads" className="mt-4">
              <RelatedList
                items={c.leads?.map((l: any) => ({
                  id: l.id, primary: l.name, secondary: formatDate(l.createdAt),
                  value: formatCurrency(l.value), status: l.stage,
                })) ?? []}
                emptyText="No leads yet"
              />
            </TabsContent>
            <TabsContent value="payments" className="mt-4">
              <RelatedList
                items={c.payments?.map((p: any) => ({
                  id: p.id, primary: p.number, secondary: formatDate(p.paidAt ?? p.createdAt),
                  value: formatCurrency(p.amount), status: p.status,
                })) ?? []}
                emptyText="No payments yet"
              />
            </TabsContent>
          </Tabs>

          {c.notes && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
              <p className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-foreground">{c.notes}</p>
            </div>
          )}
        </div>
      )}
    </DetailDrawer>
  )
}

function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </p>
      <p className="mt-0.5 text-sm text-foreground">{value || '—'}</p>
    </div>
  )
}

function RelatedList({ items, emptyText }: { items: Array<{ id: string; primary: string; secondary?: string; value?: string; status?: string }>; emptyText: string }) {
  if (items.length === 0) return <p className="py-6 text-center text-xs text-muted-foreground">{emptyText}</p>
  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {items.map((it) => (
        <div key={it.id} className="flex items-center justify-between px-3 py-2 text-xs">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{it.primary}</p>
            {it.secondary && <p className="text-muted-foreground">{it.secondary}</p>}
          </div>
          <div className="flex items-center gap-2">
            {it.value && <span className="font-medium text-foreground">{it.value}</span>}
            {it.status && (
              <StatusBadge label={it.status} className="bg-slate-100 text-slate-700 border-slate-200" />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function CustomerFormDialog({ open, onOpenChange, id }: { open: boolean; onOpenChange: (o: boolean) => void; id: string | null }) {
  const { user } = useAuth()
  const isEdit = !!id
  const { data: existing } = useEntity<Customer>('customers', id)
  const create = useCreateEntity<Record<string, unknown>>('customers', 'Customer created')
  const update = useUpdateEntity<Record<string, unknown>>('customers', id, 'Customer updated')

  const [form, setForm] = useState<Record<string, any>>({})
  const [loaded, setLoaded] = useState(false)

  // Sync form when existing data loads
  if (isEdit && existing && !loaded) {
    setForm({
      name: existing.name, company: existing.company, email: existing.email,
      phone: existing.phone ?? '', website: existing.website ?? '',
      address: existing.address ?? '', city: existing.city ?? '',
      state: existing.state ?? '', country: existing.country ?? '',
      postalCode: existing.postalCode ?? '',
      type: existing.type, status: existing.status, industry: existing.industry ?? '',
      annualRevenue: existing.annualRevenue ?? '', employees: existing.employees ?? '',
      notes: existing.notes ?? '', tags: existing.tags ?? '',
    })
    setLoaded(true)
  }

  if (!isEdit && Object.keys(form).length === 0) {
    setForm({
      name: '', company: '', email: '', phone: '', website: '', address: '',
      city: '', state: '', country: '', postalCode: '',
      type: 'BUSINESS', status: 'ACTIVE', industry: '', annualRevenue: '', employees: '',
      notes: '', tags: '',
    })
  }

  function set<K extends string>(k: K, v: any) { setForm((f) => ({ ...f, [k]: v })) }

  async function onSubmit() {
    const payload = {
      ...form,
      annualRevenue: form.annualRevenue ? Number(form.annualRevenue) : null,
      employees: form.employees ? Number(form.employees) : null,
    }
    if (isEdit) {
      await update.mutateAsync(payload)
    } else {
      await create.mutateAsync(payload)
    }
    setLoaded(false)
    setForm({})
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => { if (!o) { setLoaded(false); setForm({}) } onOpenChange(o) }}
      title={isEdit ? 'Edit Customer' : 'Add Customer'}
      description={isEdit ? 'Update customer information' : 'Create a new customer account'}
      onSubmit={onSubmit}
      loading={create.isPending || update.isPending}
      submitLabel={isEdit ? 'Save changes' : 'Create customer'}
      size="xl"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Contact name *">
          <Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} required />
        </Field>
        <Field label="Company *">
          <Input value={form.company ?? ''} onChange={(e) => set('company', e.target.value)} required />
        </Field>
        <Field label="Email *">
          <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} required />
        </Field>
        <Field label="Phone">
          <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Website">
          <Input value={form.website ?? ''} onChange={(e) => set('website', e.target.value)} placeholder="https://" />
        </Field>
        <Field label="Industry">
          <Input value={form.industry ?? ''} onChange={(e) => set('industry', e.target.value)} />
        </Field>
        <Field label="Type">
          <Select value={form.type} onValueChange={(v) => set('type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BUSINESS">Business</SelectItem>
              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Address">
          <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="City">
          <Input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
        </Field>
        <Field label="State / Province">
          <Input value={form.state ?? ''} onChange={(e) => set('state', e.target.value)} />
        </Field>
        <Field label="Country">
          <Input value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} />
        </Field>
        <Field label="Annual revenue (USD)">
          <Input type="number" value={form.annualRevenue ?? ''} onChange={(e) => set('annualRevenue', e.target.value)} />
        </Field>
        <Field label="Employees">
          <Input type="number" value={form.employees ?? ''} onChange={(e) => set('employees', e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
      </Field>
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
