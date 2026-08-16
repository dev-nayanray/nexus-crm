'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  [key: string]: string | number | undefined
}

interface UseEntityOptions {
  entity: string
  invalidateKeys?: string[]
}

export function useEntityList<T>(entity: string, params: ListParams = {}) {
  const query = useQuery({
    queryKey: [entity, 'list', params],
    queryFn: async () => {
      const sp = new URLSearchParams()
      for (const [k, v] of Object.entries(params)) {
        if (v != null && v !== '' && v !== 'all') sp.set(k, String(v))
      }
      const res = await fetch(`/api/${entity}?${sp.toString()}`)
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Failed to load' }))
        throw new Error(e.error ?? 'Failed to load')
      }
      return res.json() as Promise<{ data: T[]; total: number; page: number; pageSize: number; totalPages: number }>
    },
  })
  return query
}

export function useEntity<T>(entity: string, id: string | null) {
  return useQuery({
    queryKey: [entity, 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/${entity}/${id}`)
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Failed to load' }))
        throw new Error(e.error ?? 'Failed to load')
      }
      return res.json() as Promise<T>
    },
  })
}

export function useCreateEntity<TInput, T = unknown>(entity: string, successMsg = 'Record created') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: TInput) => {
      const res = await fetch(`/api/${entity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Failed to create' }))
        throw new Error(e.error ?? 'Failed to create')
      }
      return res.json() as Promise<T>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entity] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['activity-logs'] })
      toast.success(successMsg)
    },
  })
}

export function useUpdateEntity<TInput, T = unknown>(entity: string, id: string | null, successMsg = 'Record updated') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<TInput>) => {
      const res = await fetch(`/api/${entity}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Failed to update' }))
        throw new Error(e.error ?? 'Failed to update')
      }
      return res.json() as Promise<T>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entity] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['activity-logs'] })
      toast.success(successMsg)
    },
  })
}

export function useDeleteEntity(entity: string, successMsg = 'Record deleted') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/${entity}/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Failed to delete' }))
        throw new Error(e.error ?? 'Failed to delete')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entity] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['activity-logs'] })
      toast.success(successMsg)
    },
  })
}

// Generic action (e.g., convert lead, convert quotation, record payment)
export function useEntityAction<TInput = unknown, T = unknown>(
  actionName: string,
  successMsg = 'Action completed'
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ entity, id, action, input }: { entity: string; id: string; action: string; input?: TInput }) => {
      const res = await fetch(`/api/${entity}/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input ?? {}),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Action failed' }))
        throw new Error(e.error ?? 'Action failed')
      }
      return res.json() as Promise<T>
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [vars.entity] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['activity-logs'] })
      toast.success(successMsg)
    },
  })
}
