import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, parsePagination, paginatedResponse, scopeWhere, logActivity } from '@/lib/api'

const LeadSchema = z.object({
  name: z.string().min(1),
  company: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  source: z.string().optional().default('WEBSITE'),
  stage: z.string().optional().default('NEW'),
  status: z.string().optional().default('OPEN'),
  value: z.number().optional().default(0),
  currency: z.string().optional().default('USD'),
  probability: z.number().min(0).max(100).optional().default(0),
  customerId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { page, pageSize, skip, take, search, sort, order } = parsePagination(req)
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const stage = url.searchParams.get('stage')
    const source = url.searchParams.get('source')

    const where = {
      ...scopeWhere(user),
      ...(status && status !== 'all' ? { status } : {}),
      ...(stage && stage !== 'all' ? { stage } : {}),
      ...(source && source !== 'all' ? { source } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { company: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    }

    const allowedSorts = ['createdAt', 'value', 'stage', 'status', 'expectedCloseDate', 'name']
    const sortField = allowedSorts.includes(sort) ? sort : 'createdAt'

    const [data, total] = await Promise.all([
      db.lead.findMany({
        where,
        skip,
        take,
        orderBy: { [sortField]: order },
        include: {
          owner: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, company: true } },
        },
      }),
      db.lead.count({ where }),
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
    const parsed = LeadSchema.parse(body)

    const count = await db.lead.count()
    const lead = await db.lead.create({
      data: {
        ...parsed,
        ownerId: user.id,
        expectedCloseDate: parsed.expectedCloseDate ? new Date(parsed.expectedCloseDate) : null,
      },
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, company: true } },
      },
    })

    await logActivity({
      userId: user.id,
      action: 'CREATE',
      entity: 'LEAD',
      entityId: lead.id,
      entityName: lead.name,
      summary: `Created lead "${lead.name}" at ${lead.company} ($${lead.value})`,
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
