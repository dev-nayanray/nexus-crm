import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, parsePagination, paginatedResponse, scopeWhere, logActivity } from '@/lib/api'

const Schema = z.object({
  type: z.string().optional().default('CALL'),
  direction: z.string().optional().default('OUTBOUND'),
  status: z.string().optional().default('COMPLETED'),
  duration: z.number().int().min(0).optional().default(0),
  subject: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  startedAt: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { page, pageSize, skip, take, search, sort, order } = parsePagination(req)
    const url = new URL(req.url)
    const type = url.searchParams.get('type')
    const status = url.searchParams.get('status')
    const customerId = url.searchParams.get('customerId')
    const leadId = url.searchParams.get('leadId')

    const where = {
      ...scopeWhere(user, 'userId'),
      ...(type && type !== 'all' ? { type } : {}),
      ...(status && status !== 'all' ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(leadId ? { leadId } : {}),
      ...(search ? { OR: [{ subject: { contains: search } }, { notes: { contains: search } }] } : {}),
    }

    const [data, total] = await Promise.all([
      db.call.findMany({
        where, skip, take,
        orderBy: { startedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, company: true } },
          lead: { select: { id: true, name: true, company: true } },
        },
      }),
      db.call.count({ where }),
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

    const call = await db.call.create({
      data: {
        ...parsed,
        userId: user.id,
        startedAt: parsed.startedAt ? new Date(parsed.startedAt) : new Date(),
        customerId: parsed.customerId ?? null,
        leadId: parsed.leadId ?? null,
        subject: parsed.subject ?? null,
        notes: parsed.notes ?? null,
      },
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, company: true } },
        lead: { select: { id: true, name: true, company: true } },
      },
    })

    await logActivity({
      userId: user.id, action: 'CREATE', entity: 'CALL', entityId: call.id, entityName: call.subject ?? 'Call',
      summary: `Logged ${call.type.toLowerCase()} ${call.direction.toLowerCase()} (${call.duration}s)`,
    })
    return NextResponse.json(call, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
