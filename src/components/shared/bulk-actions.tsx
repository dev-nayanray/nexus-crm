'use client'

import { ReactNode, useState } from 'react'
import { Loader2, X, Trash2, UserCog, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormDialog } from './form-dialog'
import { ConfirmDialog } from './confirm-dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ROLES } from '@/lib/constants'
import { initials } from '@/lib/utils'

interface BulkAction {
  id: string
  label: string
  icon: ReactNode
  variant?: 'default' | 'destructive'
  onClick: () => void
}

interface BulkActionBarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClear: () => void
  actions: BulkAction[]
}

export function BulkActionBar({ selectedCount, totalCount, onSelectAll, onClear, actions }: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 shadow-md backdrop-blur animate-slide-up">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-sm">
          {selectedCount}
        </span>
        <span className="text-sm font-semibold text-foreground">
          {selectedCount === 1 ? '1 record' : `${selectedCount} records`} selected
          {selectedCount < totalCount && (
            <button
              onClick={onSelectAll}
              className="ml-2 text-xs font-medium text-primary hover:underline"
            >
              Select all {totalCount}
            </button>
          )}
        </span>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {actions.map((a) => (
          <Button
            key={a.id}
            size="sm"
            variant={a.variant === 'destructive' ? 'destructive' : 'outline'}
            onClick={a.onClick}
            className="gap-1.5"
          >
            {a.icon}
            <span className="hidden sm:inline">{a.label}</span>
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={onClear} className="gap-1.5">
          <X className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
      </div>
    </div>
  )
}

// ─── Bulk Assign Dialog ─────────────────────────────────────────────────────

export function BulkAssignDialog({
  open,
  onOpenChange,
  count,
  entityLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  count: number
  entityLabel: string
  onConfirm: (userId: string) => Promise<void>
}) {
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: usersData } = useQuery({
    queryKey: ['users', 'list', { pageSize: 100 }],
    queryFn: async () => {
      const r = await fetch('/api/users?pageSize=100')
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    enabled: open,
  })

  async function handleConfirm() {
    if (!userId) {
      toast.error('Select a user')
      return
    }
    setLoading(true)
    try {
      await onConfirm(userId)
      setUserId('')
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => { if (!o) setUserId(''); onOpenChange(o) }}
      title="Assign to user"
      description={`Reassign ${count} ${entityLabel}${count !== 1 ? 's' : ''} to a new owner`}
      onSubmit={handleConfirm}
      loading={loading}
      submitLabel="Assign"
      size="sm"
    >
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">New owner</Label>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger><SelectValue placeholder="Select user…" /></SelectTrigger>
          <SelectContent>
            {usersData?.data?.map((u: any) => (
              <SelectItem key={u.id} value={u.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-emerald-50 text-[9px] text-emerald-700">{initials(u.name)}</AvatarFallback>
                  </Avatar>
                  <span>{u.name}</span>
                  <span className="text-[10px] text-muted-foreground">· {ROLES[u.role as keyof typeof ROLES]?.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </FormDialog>
  )
}

// ─── Bulk Status Dialog ─────────────────────────────────────────────────────

export function BulkStatusDialog({
  open,
  onOpenChange,
  count,
  entityLabel,
  statusLabel,
  statuses,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  count: number
  entityLabel: string
  statusLabel: string  // "Status" or "Stage"
  statuses: Array<{ value: string; label: string; color: string }>
  onConfirm: (status: string) => Promise<void>
}) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (!value) {
      toast.error(`Select a ${statusLabel.toLowerCase()}`)
      return
    }
    setLoading(true)
    try {
      await onConfirm(value)
      setValue('')
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => { if (!o) setValue(''); onOpenChange(o) }}
      title={`Change ${statusLabel.toLowerCase()}`}
      description={`Update ${statusLabel.toLowerCase()} for ${count} ${entityLabel}${count !== 1 ? 's' : ''}`}
      onSubmit={handleConfirm}
      loading={loading}
      submitLabel="Apply"
      size="sm"
    >
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">New {statusLabel.toLowerCase()}</Label>
        <div className="grid grid-cols-2 gap-2">
          {statuses.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setValue(s.value)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                value === s.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${s.color.split(' ')[0]}`} />
              <span className="font-medium text-foreground">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </FormDialog>
  )
}

// ─── Bulk Delete Confirm ────────────────────────────────────────────────────

export function BulkDeleteDialog({
  open,
  onOpenChange,
  count,
  entityLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  count: number
  entityLabel: string
  onConfirm: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${count} ${entityLabel}${count !== 1 ? 's' : ''}?`}
      description={`This permanently deletes ${count} ${entityLabel.toLowerCase()}${count !== 1 ? 's' : ''}. This action cannot be undone.`}
      confirmLabel={`Delete ${count}`}
      variant="destructive"
      loading={loading}
      onConfirm={handleConfirm}
    />
  )
}

// ─── Hook: useBulkAction ────────────────────────────────────────────────────

export function useBulkAction(entity: string) {
  const qc = useQueryClient()
  return {
    execute: async (action: 'delete' | 'assign' | 'status' | 'stage', ids: string[], value?: string) => {
      const res = await fetch(`/api/${entity}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids, value }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Bulk action failed' }))
        throw new Error(e.error ?? 'Bulk action failed')
      }
      const result = await res.json()
      qc.invalidateQueries({ queryKey: [entity] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['activity-logs'] })
      return result
    },
  }
}
