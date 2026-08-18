/**
 * Server-side helper to broadcast CRM events to the Socket.io mini-service.
 * Called from API routes after create/update/delete operations.
 * Non-blocking — failures are logged but don't affect the API response.
 */

interface CrmEventPayload {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'CONVERT' | 'STATUS_CHANGE' | 'BULK'
  entity: string
  entityId: string
  entityName?: string
  summary: string
  userId?: string
  userName?: string
}

const REALTIME_URL = process.env.REALTIME_URL ?? 'http://localhost:3003'

export async function broadcastEvent(event: CrmEventPayload): Promise<void> {
  try {
    await fetch(`${REALTIME_URL}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  } catch (e) {
    // Silent fail — realtime is best-effort, not critical path
    if (process.env.NODE_ENV !== 'production') {
      console.error('[broadcastEvent] realtime service unreachable:', e)
    }
  }
}
