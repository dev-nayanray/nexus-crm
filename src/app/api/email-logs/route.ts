import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, parsePagination, paginatedResponse, scopeWhere, logActivity } from '@/lib/api'

const Schema = z.object({
  to: z.string().min(1),
  from: z.string().min(1),
  cc: z.string().optional().nullable(),
  bcc: z.string().optional().nullable(),
  subject: z.string().min(1),
  body: z.string().min(1),
  status: z.string().optional().default('SENT'),
  customerId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { page, pageSize, skip, take, search, sort, order } = parsePagination(req)
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const customerId = url.searchParams.get('customerId')
    const leadId = url.searchParams.get('leadId')

    const where = {
      ...scopeWhere(user, 'userId'),
      ...(status && status !== 'all' ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(leadId ? { leadId } : {}),
      ...(search ? { OR: [{ subject: { contains: search } }, { to: { contains: search } }, { from: { contains: search } }] } : {}),
    }

    const [data, total] = await Promise.all([
      db.emailLog.findMany({
        where, skip, take,
        orderBy: { [sort]: order },
        include: {
          user: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, company: true } },
          lead: { select: { id: true, name: true, company: true } },
        },
      }),
      db.emailLog.count({ where }),
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

    const email = await db.emailLog.create({
      data: {
        ...parsed,
        userId: user.id,
        cc: parsed.cc ?? null,
        bcc: parsed.bcc ?? null,
        customerId: parsed.customerId ?? null,
        leadId: parsed.leadId ?? null,
      },
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, company: true } },
      },
    })

    await logActivity({
      userId: user.id, action: 'CREATE', entity: 'EMAIL', entityId: email.id, entityName: email.subject,
      summary: `Sent email "${email.subject}" to ${email.to}`,
    })
    return NextResponse.json(email, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
