'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Target, Plus, MoreHorizontal, Pencil, Trash2, ExternalLink, UserPlus, UserCog, RefreshCw } from 'lucide-react'
import { useEntityList, useEntity, useCreateEntity, useUpdateEntity } from '@/hooks/use-entity'
import { useModuleStore } from '@/stores/module-store'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { DetailDrawer, DrawerInfoGrid, DrawerInfoItem } from '@/components/shared/detail-drawer'
import { LeadScoreBadge } from '@/components/shared/lead-score-badge'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ViewToggle } from '@/components/shared/view-toggle'
import { BulkActionBar, BulkAssignDialog, BulkStatusDialog, BulkDeleteDialog, useBulkAction } from '@/components/shared/bulk-actions'
import { ExportButton } from '@/components/shared/export-button'
import { SavedFiltersButton } from '@/components/shared/saved-filters-button'
import { Button } from '@/components/ui/button'
import { LeadsKanban } from './kanban'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LEAD_STAGES, LEAD_SOURCES } from '@/lib/constants'
import { formatCurrency, formatDate, formatRelative, initials } from '@/lib/utils'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'

type Lead = any

export function LeadsModule() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [convertId, setConvertId] = useState<string | null>(null)
  const { selectedId, select } = useModuleStore()
  const viewMode = useModuleStore((s) => s.viewModes[s.active] ?? 'list')
  const { user } = useAuth()
  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES_MANAGER'

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkAssign, setBulkAssign] = useState(false)
  const [bulkStatus, setBulkStatus] = useState(false)
  const [bulkDelete, setBulkDelete] = useState(false)
  const bulk = useBulkAction('leads')

  const { data, isLoading, error, refetch } = useEntityList<Lead>('leads', {
    page, pageSize: 10, status: statusFilter, stage: stageFilter,
  })

  const columns: ColumnDef<Lead>[] = [
    {
      id: 'name',
      header: 'Lead',
      cell: ({ row }) => {
        const l = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-sky-50 text-xs font-medium text-sky-700">{initials(l.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{l.name}</p>
              <p className="truncate text-xs text-muted-foreground">{l.company}</p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'value',
      header: 'Value',
      cell: ({ row }) => <span className="text-sm font-semibold text-foreground">{formatCurrency(row.original.value, row.original.currency)}</span>,
    },
    {
      id: 'score',
      header: 'Score',
      cell: ({ row }) => <LeadScoreBadge lead={row.original} />,
    },
    {
      id: 'stage',
      header: 'Stage',
      cell: ({ row }) => (
        <StatusBadge
          label={LEAD_STAGES[row.original.stage]?.label ?? row.original.stage}
          className={LEAD_STAGES[row.original.stage]?.color}
        />
      ),
    },
    {
      id: 'source',
      header: 'Source',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.source.replace('_', ' ').toLowerCase()}</span>,
    },
    {
      id: 'probability',
      header: 'Probability',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-12 rounded-full bg-muted">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.original.probability}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{row.original.probability}%</span>
        </div>
      ),
    },
    {
      id: 'owner',
      header: 'Owner',
      cell: ({ row }) => <span className="text-xs">{row.original.owner?.name ?? '—'}</span>,
    },
    {
      id: 'expectedCloseDate',
      header: 'Expected Close',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.expectedCloseDate)}</span>,
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
            {row.original.status === 'OPEN' && (
              <DropdownMenuItem onClick={() => setConvertId(row.original.id)}>
                <UserPlus className="mr-2 h-3.5 w-3.5" /> Convert to customer
              </DropdownMenuItem>
            )}
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
        title="Leads"
        description="Track and convert prospects into customers"
        icon={<Target className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle />
            <ExportButton entity="leads" filters={{ status: statusFilter, stage: stageFilter }} />
            <Button onClick={() => setCreating(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </div>
        }
      />

      {viewMode === 'kanban' ? (
        <LeadsKanban />
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
                id: 'status', label: 'Change stage', icon: <RefreshCw className="h-3.5 w-3.5" />,
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
            searchPlaceholder="Search leads…"
            onRowClick={(row) => select(row.id!)}
            pageSize={10}
            enableSelection
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            toolbar={
              <>
                <SavedFiltersButton
                  module="leads"
                  currentFilters={{ status: statusFilter, stage: stageFilter }}
                  onApplyFilter={(f) => {
                    if (f.status) setStatusFilter(f.status)
                    if (f.stage) setStageFilter(f.stage)
                  }}
                />
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stages</SelectItem>
                    {Object.entries(LEAD_STAGES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="CONVERTED">Converted</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
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
        entityLabel="lead"
        onConfirm={async (userId) => {
          const r = await bulk.execute('assign', selectedIds, userId)
          toast.success(`Assigned ${r.count} leads`)
          setSelectedIds([])
        }}
      />

      <BulkStatusDialog
        open={bulkStatus}
        onOpenChange={setBulkStatus}
        count={selectedIds.length}
        entityLabel="lead"
        statusLabel="Stage"
        statuses={Object.entries(LEAD_STAGES).map(([value, c]) => ({ value, label: c.label, color: c.color }))}
        onConfirm={async (stage) => {
          const r = await bulk.execute('stage', selectedIds, stage)
          toast.success(`Updated ${r.count} leads`)
          setSelectedIds([])
        }}
      />

      <BulkDeleteDialog
        open={bulkDelete}
        onOpenChange={setBulkDelete}
        count={selectedIds.length}
        entityLabel="lead"
        onConfirm={async () => {
          const r = await bulk.execute('delete', selectedIds)
          toast.success(`Deleted ${r.count} leads`)
          setSelectedIds([])
        }}
      />

      {selectedId && (
        <LeadDetailDrawer id={selectedId} open={!!selectedId} onOpenChange={(o) => !o && select(null)} onEdit={() => setEditing(true)} />
      )}

      <LeadFormDialog open={creating || editing} onOpenChange={(o) => { setCreating(false); setEditing(false) }} id={editing ? selectedId : null} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete lead?"
        description="This permanently deletes the lead record. Related quotations and follow-ups will be unlinked."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteId) return
          const res = await fetch(`/api/leads/${deleteId}`, { method: 'DELETE' })
          if (!res.ok) { toast.error('Failed to delete lead'); return }
          toast.success('Lead deleted')
          setDeleteId(null)
          window.location.reload()
        }}
      />

      <ConfirmDialog
        open={!!convertId}
        onOpenChange={(o) => !o && setConvertId(null)}
        title="Convert lead to customer?"
        description="This will create a customer account from the lead, mark the lead as Won, and create a follow-up call for tomorrow. The lead will no longer appear in your open pipeline."
        confirmLabel="Convert"
        onConfirm={async () => {
          if (!convertId) return
          const res = await fetch(`/api/leads/${convertId}/convert`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
          if (!res.ok) { const e = await res.json(); toast.error(e.error ?? 'Failed'); return }
          toast.success('Lead converted to customer')
          setConvertId(null)
          window.location.reload()
        }}
      />
    </div>
  )
}

function LeadDetailDrawer({ id, open, onOpenChange, onEdit }: { id: string | null; open: boolean; onOpenChange: (o: boolean) => void; onEdit: () => void }) {
  const { data, isLoading } = useEntity<Lead>('leads', id)
  const qc = useQueryClient()
  const l = data

  async function changeStage(stage: string) {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    if (!res.ok) { toast.error('Failed to update stage'); return }
    toast.success(`Stage changed to ${LEAD_STAGES[stage]?.label ?? stage}`)
    qc.invalidateQueries({ queryKey: ['leads'] })
  }

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={l?.name ?? 'Lead'}
      description={l ? `${l.company} · ${l.email}` : 'Loading…'}
      width="lg"
      icon={<Target className="h-5 w-5" />}
      badge={l ? <StatusBadge label={LEAD_STAGES[l.stage]?.label ?? l.stage} className={LEAD_STAGES[l.stage]?.color} /> : undefined}
      actions={
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      }
    >
      {isLoading || !l ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/50" />)}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Lead value + score highlight */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-gradient-to-br from-emerald-50/50 to-transparent p-4 dark:from-emerald-950/20">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Lead value</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{formatCurrency(l.value, l.currency)}</p>
            </div>
            <LeadScoreBadge lead={l} showBreakdown />
          </div>

          {/* Stage workflow pills */}
          {l.status === 'OPEN' && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Move to stage</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(LEAD_STAGES).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => changeStage(k)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                      l.stage === k ? v.color + ' ring-2 ring-primary/30' : 'bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Info grid */}
          <DrawerInfoGrid>
            <DrawerInfoItem label="Probability" value={`${l.probability}%`} />
            <DrawerInfoItem label="Source" value={l.source.replace('_', ' ').toLowerCase()} />
            <DrawerInfoItem label="Expected close" value={formatDate(l.expectedCloseDate)} />
            <DrawerInfoItem label="Owner" value={l.owner?.name} />
            <DrawerInfoItem label="Customer" value={l.customer?.name} />
            <DrawerInfoItem label="Email" value={l.email} />
          </DrawerInfoGrid>

          {/* Probability bar */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Win probability</span>
              <span className="font-semibold text-foreground">{l.probability}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                style={{ width: `${l.probability}%` }}
              />
            </div>
          </div>

          {l.notes && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
              <p className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-foreground">{l.notes}</p>
            </div>
          )}

          {l.lostReason && (
            <div className="rounded-xl border border-rose-200/60 bg-rose-50/50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">Lost reason</p>
              <p className="mt-1 text-sm text-rose-900 dark:text-rose-300">{l.lostReason}</p>
            </div>
          )}
        </div>
      )}
    </DetailDrawer>
  )
}

function LeadFormDialog({ open, onOpenChange, id }: { open: boolean; onOpenChange: (o: boolean) => void; id: string | null }) {
  const isEdit = !!id
  const { data: existing } = useEntity<Lead>('leads', id)
  const create = useCreateEntity('leads', 'Lead created')
  const update = useUpdateEntity('leads', id, 'Lead updated')

  const [form, setForm] = useState<Record<string, any>>({})
  const [loaded, setLoaded] = useState(false)

  if (isEdit && existing && !loaded) {
    setForm({
      name: existing.name, company: existing.company, email: existing.email,
      phone: existing.phone ?? '', title: existing.title ?? '',
      source: existing.source, stage: existing.stage, status: existing.status,
      value: existing.value, currency: existing.currency, probability: existing.probability,
      expectedCloseDate: existing.expectedCloseDate ? new Date(existing.expectedCloseDate).toISOString().split('T')[0] : '',
      notes: existing.notes ?? '',
    })
    setLoaded(true)
  }
  if (!isEdit && Object.keys(form).length === 0) {
    setForm({
      name: '', company: '', email: '', phone: '', title: '',
      source: 'WEBSITE', stage: 'NEW', status: 'OPEN',
      value: 0, currency: 'USD', probability: 10,
      expectedCloseDate: '', notes: '',
    })
  }

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })) }

  async function onSubmit() {
    const payload = { ...form, value: Number(form.value), probability: Number(form.probability) }
    if (isEdit) await update.mutateAsync(payload)
    else await create.mutateAsync(payload)
    setLoaded(false); setForm({})
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => { if (!o) { setLoaded(false); setForm({}) } onOpenChange(o) }}
      title={isEdit ? 'Edit Lead' : 'Add Lead'}
      description={isEdit ? 'Update lead information' : 'Create a new lead in your pipeline'}
      onSubmit={onSubmit}
      loading={create.isPending || update.isPending}
      submitLabel={isEdit ? 'Save changes' : 'Create lead'}
      size="lg"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Contact name *"><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} required /></Field>
        <Field label="Company *"><Input value={form.company ?? ''} onChange={(e) => set('company', e.target.value)} required /></Field>
        <Field label="Email *"><Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} required /></Field>
        <Field label="Phone"><Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Title"><Input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="CTO, VP Eng…" /></Field>
        <Field label="Source">
          <Select value={form.source} onValueChange={(v) => set('source', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ').toLowerCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Stage">
          <Select value={form.stage} onValueChange={(v) => set('stage', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(LEAD_STAGES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Value"><Input type="number" value={form.value ?? 0} onChange={(e) => set('value', e.target.value)} /></Field>
        <Field label="Probability (%)"><Input type="number" min={0} max={100} value={form.probability ?? 0} onChange={(e) => set('probability', e.target.value)} /></Field>
        <Field label="Expected close date"><Input type="date" value={form.expectedCloseDate ?? ''} onChange={(e) => set('expectedCloseDate', e.target.value)} /></Field>
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
