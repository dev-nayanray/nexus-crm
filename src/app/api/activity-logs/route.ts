import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, apiError, parsePagination, paginatedResponse } from '@/lib/api'

export async function GET(req: NextRequest) {
  try {
    await requireUser()
    const { page, pageSize, skip, take, search } = parsePagination(req)
    const url = new URL(req.url)
    const entity = url.searchParams.get('entity')
    const action = url.searchParams.get('action')
    const userId = url.searchParams.get('userId')

    const where = {
      ...(entity && entity !== 'all' ? { entity } : {}),
      ...(action && action !== 'all' ? { action } : {}),
      ...(userId ? { userId } : {}),
      ...(search ? { summary: { contains: search } } : {}),
    }

    const [data, total] = await Promise.all([
      db.activityLog.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      }),
      db.activityLog.count({ where }),
    ])
    return paginatedResponse(data, total, page, pageSize)
  } catch (e) {
    return apiError(e)
  }
}
