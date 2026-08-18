'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { FolderTree, Plus, MoreHorizontal, Pencil, Trash2, Package, Folder } from 'lucide-react'
import { useEntityList, useEntity, useCreateEntity, useUpdateEntity } from '@/hooks/use-entity'
import { useModuleStore } from '@/stores/module-store'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { FormDialog } from '@/components/shared/form-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_STATUSES } from '@/lib/constants'
import { toast } from 'sonner'

type Category = any

export function CategoriesModule() {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const { select } = useModuleStore()

  const { data, isLoading, error, refetch } = useEntityList<Category>('categories', {
    page: 1, pageSize: 50, sort: 'sortOrder', order: 'asc',
  })

  const categories: Category[] = data?.data ?? []

  const columns: ColumnDef<Category>[] = [
    {
      id: 'name',
      header: 'Category',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.parent ? (
            <span className="text-xs text-muted-foreground">↳</span>
          ) : (
            <Folder className="h-3.5 w-3.5 text-emerald-600" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">/{row.original.slug}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'parent',
      header: 'Parent',
      cell: ({ row }) => row.original.parent
        ? <Badge variant="outline" className="text-xs">{row.original.parent.name}</Badge>
        : <span className="text-xs text-muted-foreground">— top level —</span>,
    },
    {
      id: 'products',
      header: 'Products',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Package className="h-3 w-3" /> {row.original._count?.products ?? 0}
        </span>
      ),
    },
    {
      id: 'children',
      header: 'Subcategories',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original._count?.children ?? 0}</span>,
    },
    { id: 'sortOrder', header: 'Order', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.sortOrder}</span> },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge label={CATEGORY_STATUSES[row.original.status]?.label ?? row.original.status} className={CATEGORY_STATUSES[row.original.status]?.color} />
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
        title="Categories"
        description="Organize your product catalog into a dynamic, nestable category tree"
        icon={<FolderTree className="h-5 w-5" />}
        actions={
          <Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add Category</Button>
        }
      />
      <DataTable
        data={categories}
        columns={columns}
        isLoading={isLoading}
        error={error?.message ?? null}
        onRetry={() => refetch()}
        searchPlaceholder="Search categories…"
        pageSize={50}
        emptyTitle="No categories yet"
        emptyDescription="Create your first category to start organizing products."
        emptyAction={<Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add Category</Button>}
      />

      <CategoryFormDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null) } }}
        category={editing}
        categories={categories}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This cannot be undone. Categories that still have products or subcategories cannot be deleted — reassign or remove those first."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteTarget) return
          const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: 'DELETE' })
          if (!res.ok) {
            const e = await res.json().catch(() => ({ error: 'Failed to delete' }))
            toast.error(e.error ?? 'Failed to delete')
            return
          }
          toast.success('Category deleted')
          setDeleteTarget(null)
          refetch()
        }}
      />
    </div>
  )
}

function CategoryFormDialog({
  open, onOpenChange, category, categories,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  category: Category | null
  categories: Category[]
}) {
  const isEdit = !!category
  const create = useCreateEntity('categories', 'Category created')
  const update = useUpdateEntity('categories', category?.id ?? null, 'Category updated')

  const [form, setForm] = useState<Record<string, any>>(() => category
    ? { name: category.name, description: category.description ?? '', parentId: category.parentId ?? 'none', status: category.status, sortOrder: category.sortOrder }
    : { name: '', description: '', parentId: 'none', status: 'ACTIVE', sortOrder: 0 })
  const [key, setKey] = useState(category?.id ?? 'new')

  if (key !== (category?.id ?? 'new')) {
    setKey(category?.id ?? 'new')
    setForm(category
      ? { name: category.name, description: category.description ?? '', parentId: category.parentId ?? 'none', status: category.status, sortOrder: category.sortOrder }
      : { name: '', description: '', parentId: 'none', status: 'ACTIVE', sortOrder: 0 })
  }

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })) }

  async function onSubmit() {
    const payload = {
      ...form,
      parentId: form.parentId === 'none' ? null : form.parentId,
      sortOrder: Number(form.sortOrder) || 0,
    }
    if (isEdit) await update.mutateAsync(payload)
    else await create.mutateAsync(payload)
    onOpenChange(false)
  }

  const parentOptions = categories.filter((c) => c.id !== category?.id)

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Category' : 'Add Category'}
      onSubmit={onSubmit}
      loading={create.isPending || update.isPending}
      submitLabel={isEdit ? 'Save changes' : 'Create category'}
      size="md"
    >
      <div className="space-y-4">
        <Field label="Name *"><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} required /></Field>
        <Field label="Parent category">
          <Select value={form.parentId ?? 'none'} onValueChange={(v) => set('parentId', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Top level —</SelectItem>
              {parentOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sort order"><Input type="number" value={form.sortOrder ?? 0} onChange={(e) => set('sortOrder', e.target.value)} /></Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Description"><Textarea rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
      </div>
    </FormDialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>
}
