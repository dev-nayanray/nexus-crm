'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || ''

interface CrmEvent {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'CONVERT' | 'STATUS_CHANGE' | 'BULK'
  entity: string
  entityId: string
  entityName?: string
  summary: string
  userId?: string
  userName?: string
  timestamp: string
}

// Map entity name (from server) to API route name (for query invalidation)
const ENTITY_TO_API: Record<string, string> = {
  CUSTOMER: 'customers',
  LEAD: 'leads',
  ORDER: 'orders',
  QUOTATION: 'quotations',
  PAYMENT: 'payments',
  FOLLOWUP: 'follow-ups',
  PRODUCT: 'products',
  INVENTORY: 'inventory',
  PURCHASE_ORDER: 'purchase-orders',
  CALL: 'calls',
  EMAIL: 'email-logs',
  USER: 'users',
}

/**
 * Hook to connect to the CRM realtime service and auto-invalidate query caches.
 * Mount once at the app shell level.
 */
export function useRealtimeSync() {
  const qc = useQueryClient()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!REALTIME_URL) return

    // Connect directly to the standalone realtime service
    const socket = io(REALTIME_URL, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[Realtime] connected')
    })

    socket.on('disconnect', () => {
      console.log('[Realtime] disconnected')
    })

    socket.on('connect_error', (err) => {
      // Silent — realtime is best-effort; app still works with polling
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Realtime] connection error (falling back to polling):', err.message)
      }
    })

    // Handle CRM events
    socket.on('crm:event', (event: CrmEvent) => {
      const apiEntity = ENTITY_TO_API[event.entity]
      if (apiEntity) {
        // Invalidate the affected entity's queries
        qc.invalidateQueries({ queryKey: [apiEntity] })
      }
      // Always invalidate dashboard + activity logs
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['activity-logs'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['search'] })

      // Show toast for significant events (only if not triggered by current user's tab)
      // We can't easily detect "current user's tab" here, so we show subtle toasts
      if (event.type === 'CREATE' && event.entity !== 'ACTIVITY_LOG') {
        toast.info(event.summary, {
          description: event.userName ? `by ${event.userName}` : undefined,
          duration: 4000,
        })
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [qc])
}

/**
 * Hook to get the realtime connection status.
 */
export function useRealtimeStatus() {
  // Simple stub — could be extended to track connection state
  return { connected: true }
}
