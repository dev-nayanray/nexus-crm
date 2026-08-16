'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * Fetch all items for a kanban board (large page size, no pagination)
 */
export function useKanbanList<T>(entity: string, extraParams: Record<string, string> = {}) {
  return useQuery({
    queryKey: [entity, 'kanban', extraParams],
    queryFn: async () => {
      const sp = new URLSearchParams({ pageSize: '200', ...extraParams })
      const res = await fetch(`/api/${entity}?${sp.toString()}`)
      if (!res.ok) throw new Error('Failed to load kanban data')
      return res.json() as Promise<{ data: T[]; total: number }>
    },
    staleTime: 20 * 1000,
  })
}

/**
 * Update an entity's status/stage field (for kanban drag-drop)
 */
export function useMoveEntity(entity: string, field: 'status' | 'stage') {
  const qc = useQueryClient()
  return {
    move: async (id: string, newValue: string, successMsg?: string) => {
      try {
        const res = await fetch(`/api/${entity}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: newValue }),
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({ error: 'Failed to move' }))
          throw new Error(e.error ?? 'Failed to move')
        }
        qc.invalidateQueries({ queryKey: [entity] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        qc.invalidateQueries({ queryKey: ['activity-logs'] })
        if (successMsg) toast.success(successMsg)
        return true
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to move card')
        // Force refetch to revert optimistic state
        qc.invalidateQueries({ queryKey: [entity] })
        return false
      }
    },
  }
}

/**
 * Update order status via dedicated status endpoint
 */
export function useMoveOrder() {
  const qc = useQueryClient()
  return {
    move: async (id: string, newStatus: string) => {
      try {
        const res = await fetch(`/api/orders/${id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({ error: 'Failed to move' }))
          throw new Error(e.error ?? 'Failed to move')
        }
        qc.invalidateQueries({ queryKey: ['orders'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        qc.invalidateQueries({ queryKey: ['activity-logs'] })
        toast.success(`Order moved to ${newStatus.toLowerCase()}`)
        return true
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to move card')
        qc.invalidateQueries({ queryKey: ['orders'] })
        return false
      }
    },
  }
}
