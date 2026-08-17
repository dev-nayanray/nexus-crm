'use client'

import { useEffect, useRef, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'

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
 * Realtime provider — connects to Socket.io only when mounted (i.e., when authenticated).
 * Wrapped in try-catch so realtime failures NEVER crash the app.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const socketRef = useRef<any>(null)

  useEffect(() => {
    // No realtime service configured for this deployment — skip entirely
    // instead of trying (and failing) to connect to a relative URL that
    // has nothing to resolve it.
    if (!REALTIME_URL) return

    let socket: any = null

    try {
      // Dynamic import so if socket.io-client fails to load, app still works
      import('socket.io-client')
        .then(({ io }) => {
          try {
            socket = io(REALTIME_URL, {
              transports: ['websocket', 'polling'],
              forceNew: true,
              reconnection: true,
              reconnectionAttempts: 5,
              reconnectionDelay: 3000,
              timeout: 10000,
            })
            socketRef.current = socket

            socket.on('connect', () => {
              // Connected — realtime updates will flow
            })

            socket.on('crm:event', (event: CrmEvent) => {
              try {
                const apiEntity = ENTITY_TO_API[event.entity]
                if (apiEntity) {
                  qc.invalidateQueries({ queryKey: [apiEntity] })
                }
                qc.invalidateQueries({ queryKey: ['dashboard'] })
                qc.invalidateQueries({ queryKey: ['activity-logs'] })
                qc.invalidateQueries({ queryKey: ['notifications'] })
                qc.invalidateQueries({ queryKey: ['reports'] })
                qc.invalidateQueries({ queryKey: ['search'] })
              } catch {
                // silent — don't let invalidation errors crash
              }
            })

            socket.on('connect_error', () => {
              // Silent — app falls back to polling
            })
          } catch {
            // Socket.io creation failed — app continues with polling
          }
        })
        .catch(() => {
          // import failed — app continues without realtime
        })
    } catch {
      // Any other error — app continues without realtime
    }

    return () => {
      try {
        socket?.disconnect()
      } catch {
        // ignore
      }
      socketRef.current = null
    }
  }, [qc])

  return <>{children}</>
}
