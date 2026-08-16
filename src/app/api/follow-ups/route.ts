import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, parsePagination, paginatedResponse, scopeWhere, logActivity } from '@/lib/api'

const Schema = z.object({
  title: z.string().min(1),
  type: z.string().optional().default('CALL'),
  priority: z.string().optional().default('MEDIUM'),
  status: z.string().optional().default('PENDING'),
  dueDate: z.string().min(1),
  completedAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { page, pageSize, skip, take, search, sort, order } = parsePagination(req)
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const type = url.searchParams.get('type')
    const priority = url.searchParams.get('priority')

    const where = {
      ...scopeWhere(user, 'assigneeId'),
      ...(status && status !== 'all' ? { status } : {}),
      ...(type && type !== 'all' ? { type } : {}),
      ...(priority && priority !== 'all' ? { priority } : {}),
      ...(search ? { title: { contains: search } } : {}),
    }

    const allowedSorts = ['dueDate', 'createdAt', 'priority', 'status']
    const sortField = allowedSorts.includes(sort) ? sort : 'dueDate'

    const [data, total] = await Promise.all([
      db.followUp.findMany({
        where,
        skip,
        take,
        orderBy: { [sortField]: order },
        include: {
          assignee: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, company: true } },
          lead: { select: { id: true, name: true, company: true } },
        },
      }),
      db.followUp.count({ where }),
    ])
    return paginatedResponse(data, total, page, pageSize)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const parsed = Schema.parse(body)

    const fu = await db.followUp.create({
      data: {
        ...parsed,
        assigneeId: user.id,
        dueDate: new Date(parsed.dueDate),
        completedAt: parsed.completedAt ? new Date(parsed.completedAt) : null,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, company: true } },
        lead: { select: { id: true, name: true, company: true } },
      },
    })

    await logActivity({
      userId: user.id, action: 'CREATE', entity: 'FOLLOWUP', entityId: fu.id, entityName: fu.title,
      summary: `Scheduled follow-up "${fu.title}" for ${new Date(fu.dueDate).toLocaleDateString()}`,
    })
    return NextResponse.json(fu, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
