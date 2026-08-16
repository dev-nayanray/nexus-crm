import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions, type AppSession } from './auth'
import { db } from './db'
import { getDataScope } from './permissions'

export async function getSession(): Promise<AppSession | null> {
  const session = await getServerSession(authOptions)
  return session as AppSession | null
}

export async function requireUser(): Promise<AppSession['user']> {
  const session = await getSession()
  if (!session?.user) {
    throw new ApiError(401, 'Authentication required')
  }
  return session.user
}

export async function requireRole(...roles: string[]): Promise<AppSession['user']> {
  const user = await requireUser()
  if (!roles.includes(user.role)) {
    throw new ApiError(403, 'Insufficient permissions')
  }
  return user
}

// Add a where clause based on user role for data scoping
export function scopeWhere(
  user: { id: string; role: string },
  field: string = 'ownerId'
): Record<string, string> {
  const scope = getDataScope(user.role, user.id)
  if (scope.type === 'own') {
    return { [field]: scope.userId }
  }
  return {}
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function apiError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  console.error('[API Error]', err)
  const msg = err instanceof Error ? err.message : 'Internal server error'
  return NextResponse.json({ error: msg }, { status: 500 })
}

// Pagination helper
export function parsePagination(req: Request) {
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '10', 10)))
  const search = url.searchParams.get('search') ?? ''
  const sort = url.searchParams.get('sort') ?? 'createdAt'
  const order = (url.searchParams.get('order') ?? 'desc') as 'asc' | 'desc'
  return { page, pageSize, search, sort, order, skip: (page - 1) * pageSize, take: pageSize }
}

export function paginatedResponse<T>(data: T[], total: number, page: number, pageSize: number) {
  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

// Activity log helper
export async function logActivity(params: {
  userId: string
  action: string
  entity: string
  entityId: string
  entityName?: string
  summary: string
  metadata?: Record<string, unknown>
}) {
  try {
    await db.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        entityName: params.entityName,
        summary: params.summary,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })

    // Broadcast to realtime service (best-effort, non-blocking)
    broadcastEventSafe({
      type: params.action as any,
      entity: params.entity,
      entityId: params.entityId,
      entityName: params.entityName,
      summary: params.summary,
      userId: params.userId,
    }).catch(() => { /* silent */ })
  } catch (e) {
    console.error('[logActivity] failed', e)
  }
}

// Lazy-import to avoid circular dependency
async function broadcastEventSafe(event: any) {
  try {
    const { broadcastEvent } = await import('./realtime-server')
    await broadcastEvent(event)
  } catch {
    // realtime-server may not be available in all contexts
  }
}
