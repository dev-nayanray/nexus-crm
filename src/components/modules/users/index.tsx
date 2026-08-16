'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { ShieldCheck, Plus, MoreHorizontal, Pencil, Trash2, ExternalLink, Lock } from 'lucide-react'
import { useEntityList, useEntity, useCreateEntity, useUpdateEntity } from '@/hooks/use-entity'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ROLES } from '@/lib/constants'
import { formatDate, formatRelative, initials } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

type User = any

export function UsersModule() {
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { selectedId, select } = useModuleStore()
  const { user: currentUser } = useAuth()

  const { data, isLoading, error, refetch } = useEntityList<User>('users', {
    page: 1, pageSize: 20, role: roleFilter, status: statusFilter,
  })

  const columns: ColumnDef<User>[] = [
    {
      id: 'name',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-emerald-50 text-xs font-medium text-emerald-700">{initials(row.original.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{row.original.name}{row.original.id === currentUser?.id && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    { id: 'jobTitle', header: 'Title', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.jobTitle ?? '—'}</span> },
    {
      id: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <StatusBadge label={ROLES[row.original.role as keyof typeof ROLES]?.label ?? row.original.role} className={ROLES[row.original.role as keyof typeof ROLES]?.color} />
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge label={row.original.status === 'ACTIVE' ? 'Active' : 'Disabled'} className={row.original.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'} />
      ),
    },
    {
      id: 'lastLoginAt',
      header: 'Last login',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.lastLoginAt ? formatRelative(row.original.lastLoginAt) : 'Never'}</span>,
    },
    {
      id: 'customers',
      header: 'Customers',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original._count?.customers ?? 0}</span>,
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
            <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteId(row.original.id)} disabled={row.original.id === currentUser?.id}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users & Roles"
        description="Manage team members and their access permissions"
        icon={<ShieldCheck className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton entity="users" filters={{ role: roleFilter, status: statusFilter }} />
            <Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add User</Button>
          </div>
        }
      />
      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        error={error?.message ?? null}
        onRetry={() => refetch()}
        searchPlaceholder="Search users…"
        onRowClick={(row) => select(row.id!)}
        pageSize={20}
        toolbar={
          <>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {Object.entries(ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
      {selectedId && (
        <DetailDrawer open={!!selectedId} onOpenChange={(o) => !o && select(null)} title="User details" width="md">
          <UserDetail id={selectedId} onEdit={() => setEditing(true)} />
        </DetailDrawer>
      )}
      <UserFormDialog open={creating || editing} onOpenChange={(o) => { setCreating(false); setEditing(false) }} id={editing ? selectedId : null} />
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete user?"
        description="This permanently deletes the user account. Their owned records will remain but unassigned."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteId) return
          const res = await fetch(`/api/users/${deleteId}`, { method: 'DELETE' })
          if (!res.ok) { const e = await res.json(); toast.error(e.error ?? 'Failed'); return }
          toast.success('User deleted')
          setDeleteId(null)
          window.location.reload()
        }}
      />
    </div>
  )
}

function UserDetail({ id, onEdit }: { id: string; onEdit: () => void }) {
  const { data, isLoading } = useEntity<User>('users', id)
  const u = data
  if (isLoading || !u) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />)}</div>
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <StatusBadge label={ROLES[u.role as keyof typeof ROLES]?.label ?? u.role} className={ROLES[u.role as keyof typeof ROLES]?.color} />
        <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</Button>
      </div>
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14"><AvatarFallback className="bg-emerald-50 text-sm font-medium text-emerald-700">{initials(u.name)}</AvatarFallback></Avatar>
        <div>
          <p className="text-base font-semibold text-foreground">{u.name}</p>
          <p className="text-sm text-muted-foreground">{u.email}</p>
          <p className="text-xs text-muted-foreground">{u.jobTitle ?? '—'}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4">
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p><p className="mt-0.5 text-sm text-foreground">{u.status === 'ACTIVE' ? 'Active' : 'Disabled'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Phone</p><p className="mt-0.5 text-sm text-foreground">{u.phone ?? '—'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Last login</p><p className="mt-0.5 text-sm text-foreground">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Joined</p><p className="mt-0.5 text-sm text-foreground">{formatDate(u.createdAt)}</p></div>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs font-medium text-foreground">{ROLES[u.role as keyof typeof ROLES]?.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{ROLES[u.role as keyof typeof ROLES]?.description}</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Stat label="Customers" value={u._count?.customers ?? 0} />
        <Stat label="Leads" value={u._count?.leads ?? 0} />
        <Stat label="Orders" value={u._count?.orders ?? 0} />
        <Stat label="Payments" value={u._count?.payments ?? 0} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}

function UserFormDialog({ open, onOpenChange, id }: { open: boolean; onOpenChange: (o: boolean) => void; id: string | null }) {
  const isEdit = !!id
  const { data: existing } = useEntity<User>('users', id)
  const create = useCreateEntity('users', 'User created')
  const update = useUpdateEntity('users', id, 'User updated')

  const [form, setForm] = useState<Record<string, any>>({})
  const [loaded, setLoaded] = useState(false)

  if (isEdit && existing && !loaded) {
    setForm({
      name: existing.name, email: existing.email, role: existing.role, status: existing.status,
      phone: existing.phone ?? '', jobTitle: existing.jobTitle ?? '', password: '',
    })
    setLoaded(true)
  }
  if (!isEdit && Object.keys(form).length === 0) {
    setForm({ name: '', email: '', role: 'SALES_REP', status: 'ACTIVE', phone: '', jobTitle: '', password: '' })
  }

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })) }

  async function onSubmit() {
    if (!form.name || !form.email) { toast.error('Name and email are required'); return }
    if (!isEdit && !form.password) { toast.error('Password is required for new users'); return }
    const payload = { ...form, password: form.password || undefined }
    if (isEdit) await update.mutateAsync(payload)
    else await create.mutateAsync(payload)
    setLoaded(false); setForm({})
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => { if (!o) { setLoaded(false); setForm({}) } onOpenChange(o) }}
      title={isEdit ? 'Edit User' : 'Add User'}
      onSubmit={onSubmit}
      loading={create.isPending || update.isPending}
      submitLabel={isEdit ? 'Save changes' : 'Create user'}
      size="md"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full name *"><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Email *"><Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Job title"><Input value={form.jobTitle ?? ''} onChange={(e) => set('jobTitle', e.target.value)} placeholder="Account Executive…" /></Field>
        <Field label="Phone"><Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Role">
          <Select value={form.role} onValueChange={(v) => set('role', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DISABLED">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label={isEdit ? 'New password (leave blank to keep current)' : 'Password *'}>
        <Input type="password" value={form.password ?? ''} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" />
      </Field>
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground"><Lock className="h-3 w-3" />{ROLES[form.role as keyof typeof ROLES]?.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{ROLES[form.role as keyof typeof ROLES]?.description}</p>
      </div>
    </FormDialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>
}
